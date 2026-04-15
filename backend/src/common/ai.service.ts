import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { OpenAI, toFile } from 'openai';
import { lookup as lookupMime } from 'mime-types';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { safeJsonParse } from './json.util';
import {
  DiagnosisResult,
  QuoteComparisonResult,
} from './types';

const DIAGNOSIS_PROMPT = `You are an expert auto mechanic. Analyze this car problem.

 Return ONLY valid JSON (no markdown):

 {

   "problem": "short problem title",

   "description": "detailed explanation",

   "severity": "low|medium|high",

   "parts_needed": [

     { "name": "Part name", "price_min": 0, "price_max": 0, "currency": "USD" }

   ],

   "labor_cost_min": 0,

   "labor_cost_max": 0,

   "total_cost_min": 0,

   "total_cost_max": 0,

   "confidence": 0.0

 }`;

const QUOTE_PROMPT = `Compare mechanic quote vs fair estimate.

 Return ONLY valid JSON:

 {

   "mechanic_total": 0,

   "fair_estimate_min": 0,

   "fair_estimate_max": 0,

   "verdict": "fair|overpriced|underpriced",

   "overcharge_amount": 0,

   "overcharge_percent": 0,

   "explanation": "human readable explanation",

   "suspicious_items": ["item1", "item2"]

 }`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly openAiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.geminiModel =
      this.configService.get<string>('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash';
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
  }

  async analyzeDiagnosis(input: {
    filePath: string;
    mimeType: string;
    fileType: 'image' | 'audio' | 'video';
  }): Promise<DiagnosisResult> {
    try {
      if (input.fileType === 'audio') {
        const transcript = await this.transcribeAudio(input.filePath, input.mimeType);
        return await this.generateDiagnosisFromText(transcript);
      }

      if (!this.canUseGemini()) {
        return this.buildMockDiagnosis(input.fileType);
      }

      const response = await this.generateGeminiJson<DiagnosisResult>({
        prompt: DIAGNOSIS_PROMPT,
        filePath: input.filePath,
        mimeType: input.mimeType,
      });

      return this.normalizeDiagnosis(response);
    } catch (error) {
      this.logger.warn(`Diagnosis fallback used: ${(error as Error).message}`);
      return this.buildMockDiagnosis(input.fileType);
    }
  }

  async compareQuote(input: {
    diagnosis: DiagnosisResult;
    quoteText?: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<QuoteComparisonResult> {
    try {
      if (input.quoteText?.trim()) {
        return this.buildQuoteComparisonFromText(input.quoteText, input.diagnosis);
      }

      if (!input.filePath || !input.mimeType || !this.canUseGemini()) {
        return this.buildQuoteComparisonFromText('', input.diagnosis);
      }

      const prompt = `${QUOTE_PROMPT}

Fair estimate context:
${JSON.stringify(input.diagnosis)}`;
      const response = await this.generateGeminiJson<QuoteComparisonResult>({
        prompt,
        filePath: input.filePath,
        mimeType: input.mimeType,
      });

      return this.normalizeQuoteComparison(response, input.diagnosis);
    } catch (error) {
      this.logger.warn(`Quote fallback used: ${(error as Error).message}`);
      return this.buildQuoteComparisonFromText(input.quoteText ?? '', input.diagnosis);
    }
  }

  private async generateDiagnosisFromText(text: string): Promise<DiagnosisResult> {
    if (!this.canUseGemini()) {
      return this.buildMockDiagnosis('audio', text);
    }

    try {
      const response = await this.generateGeminiJson<DiagnosisResult>({
        prompt: `${DIAGNOSIS_PROMPT}\n\nUser description:\n${text}`,
      });

      return this.normalizeDiagnosis(response);
    } catch (error) {
      this.logger.warn(`Text diagnosis fallback used: ${(error as Error).message}`);
      return this.buildMockDiagnosis('audio', text);
    }
  }

  private async transcribeAudio(filePath: string, mimeType: string): Promise<string> {
    if (!this.canUseOpenAi()) {
      return 'Customer reports rattling noise near the front brakes and reduced stopping performance.';
    }

    try {
      const openai = new OpenAI({ apiKey: this.openAiApiKey });
      const buffer = await readFile(filePath);
      const file = await toFile(buffer, basename(filePath), {
        type: mimeType || (lookupMime(filePath) || 'audio/mpeg'),
      });
      const transcript = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });

      return transcript.text;
    } catch (error) {
      this.logger.warn(`Transcription fallback used: ${(error as Error).message}`);
      return 'Customer reports rattling noise near the front brakes and reduced stopping performance.';
    }
  }

  private async generateGeminiJson<T>(input: {
    prompt: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<T> {
    if (!this.canUseGemini()) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }

    const gemini = new GoogleGenerativeAI(this.geminiApiKey);
    const parts: Part[] = [
      { text: input.prompt },
    ];

    if (input.filePath && input.mimeType) {
      const data = await readFile(input.filePath);
      parts.push({
        inlineData: {
          data: data.toString('base64'),
          mimeType: input.mimeType,
        },
      });
    }

    const candidateModels = Array.from(
      new Set([this.geminiModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite']),
    );

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts);
        const text = result.response.text();
        return safeJsonParse<T>(text);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Gemini model ${modelName} failed: ${lastError.message}`);

        const message = lastError.message.toLowerCase();
        const shouldTryNextModel =
          message.includes('404') ||
          message.includes('not found') ||
          message.includes('not supported') ||
          message.includes('503') ||
          message.includes('service unavailable') ||
          message.includes('high demand') ||
          message.includes('overloaded') ||
          message.includes('429') ||
          message.includes('quota');

        if (!shouldTryNextModel) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error('Gemini request failed');
  }

  private normalizeDiagnosis(result: DiagnosisResult): DiagnosisResult {
    return {
      ...result,
      severity: this.normalizeSeverity(result.severity),
      confidence: Number(result.confidence ?? 0.78),
      labor_cost_min: Number(result.labor_cost_min ?? 0),
      labor_cost_max: Number(result.labor_cost_max ?? 0),
      total_cost_min: Number(result.total_cost_min ?? 0),
      total_cost_max: Number(result.total_cost_max ?? 0),
      parts_needed: (result.parts_needed ?? []).map((part) => ({
        ...part,
        price_min: Number(part.price_min ?? 0),
        price_max: Number(part.price_max ?? 0),
        currency: part.currency ?? 'USD',
      })),
    };
  }

  private normalizeQuoteComparison(
    result: QuoteComparisonResult,
    diagnosis: DiagnosisResult,
  ): QuoteComparisonResult {
    return {
      mechanic_total: Number(result.mechanic_total ?? diagnosis.total_cost_max),
      fair_estimate_min: Number(result.fair_estimate_min ?? diagnosis.total_cost_min),
      fair_estimate_max: Number(result.fair_estimate_max ?? diagnosis.total_cost_max),
      verdict: this.normalizeVerdict(result.verdict),
      overcharge_amount: Number(result.overcharge_amount ?? 0),
      overcharge_percent: Number(result.overcharge_percent ?? 0),
      explanation: result.explanation ?? 'Quote compared with the estimated repair range.',
      suspicious_items: result.suspicious_items ?? [],
    };
  }

  private buildMockDiagnosis(
    fileType: 'image' | 'audio' | 'video',
    textHint = '',
  ): DiagnosisResult {
    const brakeFocused = textHint.toLowerCase().includes('brake') || fileType !== 'video';
    const parts = brakeFocused
      ? [
          { name: 'Brake Pads', price_min: 40, price_max: 75, currency: 'USD' },
          { name: 'Brake Rotors', price_min: 80, price_max: 140, currency: 'USD' },
        ]
      : [
          { name: 'Catalytic Converter Sensor', price_min: 120, price_max: 210, currency: 'USD' },
          { name: 'Exhaust Gasket Kit', price_min: 25, price_max: 45, currency: 'USD' },
        ];

    const laborMin = brakeFocused ? 120 : 180;
    const laborMax = brakeFocused ? 200 : 320;
    const partsMin = parts.reduce((sum, part) => sum + part.price_min, 0);
    const partsMax = parts.reduce((sum, part) => sum + part.price_max, 0);

    return {
      problem: brakeFocused ? 'Worn Brake Components' : 'Exhaust Efficiency Fault',
      description: brakeFocused
        ? 'The uploaded evidence suggests worn brake pads and possibly scored rotors, which can reduce stopping power and create scraping or rattling noises.'
        : 'The uploaded evidence suggests an exhaust or emissions issue, often associated with reduced efficiency and warning lights such as code P0420.',
      severity: brakeFocused ? 'high' : 'medium',
      parts_needed: parts,
      labor_cost_min: laborMin,
      labor_cost_max: laborMax,
      total_cost_min: partsMin + laborMin,
      total_cost_max: partsMax + laborMax,
      confidence: brakeFocused ? 0.84 : 0.76,
    };
  }

  private buildQuoteComparisonFromText(
    quoteText: string,
    diagnosis: DiagnosisResult,
  ): QuoteComparisonResult {
    const extracted = quoteText.match(/\d+(?:\.\d+)?/g) ?? [];
    const mechanicTotal =
      extracted.length > 0
        ? Number(extracted[extracted.length - 1])
        : Number((diagnosis.total_cost_max + diagnosis.total_cost_min) / 2);
    const fairMin = diagnosis.total_cost_min;
    const fairMax = diagnosis.total_cost_max;

    let verdict: QuoteComparisonResult['verdict'] = 'fair';
    if (mechanicTotal > fairMax) {
      verdict = 'overpriced';
    } else if (mechanicTotal < fairMin) {
      verdict = 'underpriced';
    }

    const overchargeAmount = verdict === 'overpriced' ? mechanicTotal - fairMax : 0;
    const overchargePercent =
      verdict === 'overpriced' && fairMax > 0
        ? Number(((overchargeAmount / fairMax) * 100).toFixed(2))
        : 0;

    return {
      mechanic_total: mechanicTotal,
      fair_estimate_min: fairMin,
      fair_estimate_max: fairMax,
      verdict,
      overcharge_amount: Number(overchargeAmount.toFixed(2)),
      overcharge_percent: overchargePercent,
      explanation:
        verdict === 'overpriced'
          ? 'The mechanic quote is above the expected repair range based on parts and labor.'
          : verdict === 'underpriced'
            ? 'The quote is lower than the expected range, which may reflect discounts or omitted items.'
            : 'The quote falls within the expected repair range for this diagnosis.',
      suspicious_items:
        verdict === 'overpriced'
          ? ['Labor marked above standard range', 'Parts total exceeds expected estimate']
          : [],
    };
  }

  private normalizeSeverity(value?: string): DiagnosisResult['severity'] {
    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    return 'medium';
  }

  private normalizeVerdict(value?: string): QuoteComparisonResult['verdict'] {
    if (value === 'fair' || value === 'overpriced' || value === 'underpriced') {
      return value;
    }

    return 'fair';
  }

  private canUseGemini() {
    return Boolean(this.geminiApiKey && this.geminiApiKey !== 'xxx' && process.env.NODE_ENV !== 'test');
  }

  private canUseOpenAi() {
    return Boolean(this.openAiApiKey && this.openAiApiKey !== 'xxx' && process.env.NODE_ENV !== 'test');
  }
}
