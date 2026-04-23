import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { OpenAI, toFile } from 'openai';
import Groq from 'groq-sdk';
import { lookup as lookupMime } from 'mime-types';
import { readFile } from 'fs/promises';
import { createReadStream } from 'fs';
import { basename } from 'path';
import { safeJsonParse } from './json.util';
import {
  ChatPromptMessage,
  DiagnosisResult,
  QuoteComparisonResult,
} from './types';

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_AUDIO_MODEL = 'whisper-large-v3';

const DIAGNOSIS_PROMPT = `You must respond only in Russian language. You are an expert auto mechanic specializing in the Tajikistan (Dushanbe) market. Analyze this car problem.

 All prices must be in TJS (Tajik Somoni). Labor cost is 80-200 TJS per hour. Use realistic Dushanbe market prices.

 Return ONLY valid JSON (no markdown):

 {

   "problem": "short problem title in Russian",

   "description": "detailed explanation in Russian",

   "severity": "low|medium|high",

   "parts_needed": [

     { "name": "Part name in Russian", "price_min": 0, "price_max": 0, "currency": "TJS" }

   ],

   "labor_cost_min": 0,

   "labor_cost_max": 0,

   "total_cost_min": 0,

   "total_cost_max": 0,

   "confidence": 0.0

 }`;

const QUOTE_PROMPT = `You must respond only in Russian language. Compare mechanic quote vs fair estimate. All amounts are in TJS (Tajik Somoni). Market is Dushanbe, Tajikistan.

 Return ONLY valid JSON:

 {

   "mechanic_total": 0,

   "fair_estimate_min": 0,

   "fair_estimate_max": 0,

   "verdict": "fair|overpriced|underpriced",

   "overcharge_amount": 0,

   "overcharge_percent": 0,

   "explanation": "human readable explanation in Russian",

   "suspicious_items": ["item1", "item2"]

 }`;

const CHAT_SYSTEM_PROMPT =
  'You must respond only in Russian language. You are AI Mechanic, a helpful automotive assistant. Give practical, safe, concise advice. Ask for missing car details when needed. If the issue could be dangerous, recommend stopping driving and contacting a mechanic.';

const VIDEO_TEXT_FALLBACK =
  `${DIAGNOSIS_PROMPT}\n\n` +
  `Пользователь загрузил видеозапись проблемы с автомобилем. ` +
  `Выполните диагностику на основе наиболее типичных неисправностей.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly openAiApiKey: string;
  private readonly groqApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.geminiModel =
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-2.0-flash';
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY') ?? '';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async analyzeDiagnosis(input: {
    filePath: string;
    mimeType: string;
    fileType: 'image' | 'audio' | 'video';
  }): Promise<DiagnosisResult> {
    if (input.fileType === 'audio') {
      const transcript = await this.transcribeAudio(
        input.filePath,
        input.mimeType,
      );
      return this.generateDiagnosisFromText(transcript);
    }

    const isVideo = input.fileType === 'video';

    // ── Groq ──
    if (this.canUseGroq()) {
      try {
        try {
          const res = await this.generateGroqJson<DiagnosisResult>({
            prompt: DIAGNOSIS_PROMPT,
            filePath: input.filePath,
            mimeType: input.mimeType,
          });
          return this.normalizeDiagnosis(res);
        } catch (inner) {
          if (!isVideo) throw inner;
          // Video rejected as image → retry with text description
          const res = await this.generateGroqJson<DiagnosisResult>({
            prompt: VIDEO_TEXT_FALLBACK,
          });
          return this.normalizeDiagnosis(res);
        }
      } catch (err) {
        this.logger.warn(
          `Groq diagnosis failed, trying OpenAI: ${(err as Error).message}`,
        );
      }
    }

    // ── OpenAI ──
    if (this.canUseOpenAi()) {
      try {
        try {
          const res = await this.generateOpenAiJson<DiagnosisResult>({
            prompt: DIAGNOSIS_PROMPT,
            filePath: input.filePath,
            mimeType: input.mimeType,
          });
          return this.normalizeDiagnosis(res);
        } catch (inner) {
          if (!isVideo) throw inner;
          const res = await this.generateOpenAiJson<DiagnosisResult>({
            prompt: VIDEO_TEXT_FALLBACK,
          });
          return this.normalizeDiagnosis(res);
        }
      } catch (err) {
        this.logger.warn(
          `OpenAI diagnosis failed, trying Gemini: ${(err as Error).message}`,
        );
      }
    }

    // ── Gemini (supports video natively) ──
    if (this.canUseGemini()) {
      const res = await this.generateGeminiJson<DiagnosisResult>({
        prompt: DIAGNOSIS_PROMPT,
        filePath: input.filePath,
        mimeType: input.mimeType,
      });
      return this.normalizeDiagnosis(res);
    }

    throw new InternalServerErrorException(
      'All AI providers failed for diagnosis',
    );
  }

  async compareQuote(input: {
    diagnosis: DiagnosisResult;
    quoteText?: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<QuoteComparisonResult> {
    if (input.quoteText?.trim()) {
      return this.buildQuoteComparisonFromText(
        input.quoteText,
        input.diagnosis,
      );
    }

    if (!input.filePath || !input.mimeType) {
      return this.buildQuoteComparisonFromText('', input.diagnosis);
    }

    const prompt = `${QUOTE_PROMPT}\n\nFair estimate context:\n${JSON.stringify(input.diagnosis)}`;

    // ── Groq ──
    if (this.canUseGroq()) {
      try {
        const res = await this.generateGroqJson<QuoteComparisonResult>({
          prompt,
          filePath: input.filePath,
          mimeType: input.mimeType,
        });
        return this.normalizeQuoteComparison(res, input.diagnosis);
      } catch (err) {
        this.logger.warn(
          `Groq quote failed, trying OpenAI: ${(err as Error).message}`,
        );
      }
    }

    // ── OpenAI ──
    if (this.canUseOpenAi()) {
      try {
        const res = await this.generateOpenAiJson<QuoteComparisonResult>({
          prompt,
          filePath: input.filePath,
          mimeType: input.mimeType,
        });
        return this.normalizeQuoteComparison(res, input.diagnosis);
      } catch (err) {
        this.logger.warn(
          `OpenAI quote failed, trying Gemini: ${(err as Error).message}`,
        );
      }
    }

    // ── Gemini ──
    if (this.canUseGemini()) {
      const res = await this.generateGeminiJson<QuoteComparisonResult>({
        prompt,
        filePath: input.filePath,
        mimeType: input.mimeType,
      });
      return this.normalizeQuoteComparison(res, input.diagnosis);
    }

    throw new InternalServerErrorException(
      'All AI providers failed for quote comparison',
    );
  }

  async generateChatReply(messages: ChatPromptMessage[]): Promise<string> {
    // ── Groq ──
    if (this.canUseGroq()) {
      try {
        const text = await this.generateGroqText({ messages });
        if (text.trim()) return text.trim();
      } catch (err) {
        this.logger.warn(
          `Groq chat failed, trying OpenAI: ${(err as Error).message}`,
        );
      }
    }

    // ── OpenAI ──
    if (this.canUseOpenAi()) {
      try {
        const text = await this.generateOpenAiText({ messages });
        if (text.trim()) return text.trim();
      } catch (err) {
        this.logger.warn(
          `OpenAI chat failed, trying Gemini: ${(err as Error).message}`,
        );
      }
    }

    // ── Gemini ──
    if (this.canUseGemini()) {
      const conversation = messages
        .map(
          (m) =>
            `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
        )
        .join('\n');
      const text = await this.generateGeminiText({
        prompt: `${CHAT_SYSTEM_PROMPT}\n\nConversation:\n${conversation}\n\nAssistant:`,
      });
      return text.trim();
    }

    throw new InternalServerErrorException(
      'All AI providers failed for chat',
    );
  }

  // ── Internal orchestration ────────────────────────────────────────────────

  private async generateDiagnosisFromText(
    text: string,
  ): Promise<DiagnosisResult> {
    const prompt = `${DIAGNOSIS_PROMPT}\n\nUser description:\n${text}`;

    if (this.canUseGroq()) {
      try {
        const res = await this.generateGroqJson<DiagnosisResult>({ prompt });
        return this.normalizeDiagnosis(res);
      } catch (err) {
        this.logger.warn(
          `Groq text diagnosis failed, trying OpenAI: ${(err as Error).message}`,
        );
      }
    }

    if (this.canUseOpenAi()) {
      try {
        const res = await this.generateOpenAiJson<DiagnosisResult>({ prompt });
        return this.normalizeDiagnosis(res);
      } catch (err) {
        this.logger.warn(
          `OpenAI text diagnosis failed, trying Gemini: ${(err as Error).message}`,
        );
      }
    }

    if (this.canUseGemini()) {
      const res = await this.generateGeminiJson<DiagnosisResult>({ prompt });
      return this.normalizeDiagnosis(res);
    }

    throw new InternalServerErrorException(
      'All AI providers failed for text diagnosis',
    );
  }

  private async transcribeAudio(
    filePath: string,
    mimeType: string,
  ): Promise<string> {
    if (this.canUseGroq()) {
      try {
        return await this.transcribeAudioGroq(filePath);
      } catch (err) {
        this.logger.warn(
          `Groq transcription failed, trying OpenAI: ${(err as Error).message}`,
        );
      }
    }

    if (this.canUseOpenAi()) {
      const openai = new OpenAI({ apiKey: this.openAiApiKey });
      const buffer = await readFile(filePath);
      const file = await toFile(buffer, basename(filePath), {
        type: mimeType || (lookupMime(filePath) as string) || 'audio/mpeg',
      });
      const transcript = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return transcript.text;
    }

    throw new InternalServerErrorException(
      'No transcription API available (Groq and OpenAI both unconfigured or failed)',
    );
  }

  // ── Groq ──────────────────────────────────────────────────────────────────

  private async generateGroqJson<T>(input: {
    prompt: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<T> {
    const groq = new Groq({ apiKey: this.groqApiKey });
    const hasFile = Boolean(input.filePath && input.mimeType);

    type TextPart = { type: 'text'; text: string };
    type ImagePart = { type: 'image_url'; image_url: { url: string } };

    let userContent: string | Array<TextPart | ImagePart>;

    if (hasFile) {
      const data = await readFile(input.filePath!);
      const base64 = data.toString('base64');
      userContent = [
        { type: 'text', text: input.prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${input.mimeType};base64,${base64}`,
          },
        },
      ];
    } else {
      userContent = input.prompt;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You must respond only in Russian language. Return ONLY valid JSON, no markdown.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
    };

    if (!hasFile) {
      params.response_format = { type: 'json_object' };
    }

    const completion = await groq.chat.completions.create(params);
    const text = completion.choices[0]?.message?.content ?? '';
    return safeJsonParse<T>(text);
  }

  private async generateGroqText(input: {
    messages: ChatPromptMessage[];
  }): Promise<string> {
    const groq = new Groq({ apiKey: this.groqApiKey });

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  private async transcribeAudioGroq(filePath: string): Promise<string> {
    const groq = new Groq({ apiKey: this.groqApiKey });
    const transcription = await groq.audio.transcriptions.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      file: createReadStream(filePath) as any,
      model: GROQ_AUDIO_MODEL,
    });
    return transcription.text;
  }

  // ── OpenAI ────────────────────────────────────────────────────────────────

  private async generateOpenAiJson<T>(input: {
    prompt: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<T> {
    const openai = new OpenAI({ apiKey: this.openAiApiKey });
    const hasFile = Boolean(input.filePath && input.mimeType);

    type TextPart = { type: 'text'; text: string };
    type ImagePart = { type: 'image_url'; image_url: { url: string } };

    let userContent: string | Array<TextPart | ImagePart>;

    if (hasFile) {
      const data = await readFile(input.filePath!);
      const base64 = data.toString('base64');
      userContent = [
        { type: 'text', text: input.prompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${input.mimeType};base64,${base64}`,
          },
        },
      ];
    } else {
      userContent = input.prompt;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You must respond only in Russian language. Return ONLY valid JSON, no markdown.',
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
    };

    if (!hasFile) {
      params.response_format = { type: 'json_object' };
    }

    const completion = await openai.chat.completions.create(params);
    const text = completion.choices[0]?.message?.content ?? '';
    return safeJsonParse<T>(text);
  }

  private async generateOpenAiText(input: {
    messages: ChatPromptMessage[];
  }): Promise<string> {
    const openai = new OpenAI({ apiKey: this.openAiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: CHAT_SYSTEM_PROMPT },
        ...input.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? '';
  }

  // ── Gemini (fallback, kept intact) ───────────────────────────────────────

  private async generateGeminiJson<T>(input: {
    prompt: string;
    filePath?: string;
    mimeType?: string;
  }): Promise<T> {
    if (!this.canUseGemini()) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }

    const gemini = new GoogleGenerativeAI(this.geminiApiKey);
    const parts: Part[] = [{ text: input.prompt }];

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
      new Set([this.geminiModel, 'gemini-2.0-flash', 'gemini-2.0-flash-lite']),
    );

    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const model = gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: 'You must respond only in Russian language.',
        });
        const result = await model.generateContent(parts);
        const text = result.response.text();
        return safeJsonParse<T>(text);
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Gemini model ${modelName} failed: ${lastError.message}`,
        );

        const msg = lastError.message.toLowerCase();
        const retryable =
          msg.includes('404') ||
          msg.includes('not found') ||
          msg.includes('not supported') ||
          msg.includes('503') ||
          msg.includes('service unavailable') ||
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('429') ||
          msg.includes('quota');

        if (!retryable) throw lastError;
      }
    }

    throw lastError ?? new Error('Gemini request failed');
  }

  private async generateGeminiText(input: { prompt: string }): Promise<string> {
    if (!this.canUseGemini()) {
      throw new InternalServerErrorException('Gemini API key is missing');
    }

    const gemini = new GoogleGenerativeAI(this.geminiApiKey);
    const candidateModels = Array.from(
      new Set([this.geminiModel, 'gemini-2.0-flash', 'gemini-2.0-flash-lite']),
    );
    let lastError: Error | null = null;

    for (const modelName of candidateModels) {
      try {
        const model = gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: CHAT_SYSTEM_PROMPT,
        });
        const result = await model.generateContent(input.prompt);
        return result.response.text();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Gemini chat model ${modelName} failed: ${lastError.message}`,
        );

        const msg = lastError.message.toLowerCase();
        const retryable =
          msg.includes('404') ||
          msg.includes('not found') ||
          msg.includes('not supported') ||
          msg.includes('503') ||
          msg.includes('service unavailable') ||
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('429') ||
          msg.includes('quota');

        if (!retryable) throw lastError;
      }
    }

    throw lastError ?? new Error('Gemini chat request failed');
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

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
        currency: part.currency ?? 'TJS',
      })),
    };
  }

  private normalizeQuoteComparison(
    result: QuoteComparisonResult,
    diagnosis: DiagnosisResult,
  ): QuoteComparisonResult {
    return {
      mechanic_total: Number(result.mechanic_total ?? diagnosis.total_cost_max),
      fair_estimate_min: Number(
        result.fair_estimate_min ?? diagnosis.total_cost_min,
      ),
      fair_estimate_max: Number(
        result.fair_estimate_max ?? diagnosis.total_cost_max,
      ),
      verdict: this.normalizeVerdict(result.verdict),
      overcharge_amount: Number(result.overcharge_amount ?? 0),
      overcharge_percent: Number(result.overcharge_percent ?? 0),
      explanation:
        result.explanation ??
        'Смета сравнена с расчётным диапазоном стоимости ремонта.',
      suspicious_items: result.suspicious_items ?? [],
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
        : (diagnosis.total_cost_max + diagnosis.total_cost_min) / 2;
    const fairMin = diagnosis.total_cost_min;
    const fairMax = diagnosis.total_cost_max;

    let verdict: QuoteComparisonResult['verdict'] = 'fair';
    if (mechanicTotal > fairMax) verdict = 'overpriced';
    else if (mechanicTotal < fairMin) verdict = 'underpriced';

    const overchargeAmount =
      verdict === 'overpriced' ? mechanicTotal - fairMax : 0;
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
          ? 'Смета механика превышает ожидаемый диапазон стоимости ремонта с учётом запчастей и работы.'
          : verdict === 'underpriced'
            ? 'Смета ниже ожидаемого диапазона, что может объясняться скидками или пропущенными позициями.'
            : 'Смета находится в пределах ожидаемого диапазона стоимости для данной диагностики.',
      suspicious_items:
        verdict === 'overpriced'
          ? [
              'Стоимость работ выше стандартного диапазона',
              'Сумма за запчасти превышает расчётную',
            ]
          : [],
    };
  }

  private normalizeSeverity(value?: string): DiagnosisResult['severity'] {
    if (value === 'low' || value === 'medium' || value === 'high') return value;
    return 'medium';
  }

  private normalizeVerdict(value?: string): QuoteComparisonResult['verdict'] {
    if (value === 'fair' || value === 'overpriced' || value === 'underpriced')
      return value;
    return 'fair';
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private canUseGroq(): boolean {
    return Boolean(
      this.groqApiKey &&
        this.groqApiKey !== 'xxx' &&
        process.env.NODE_ENV !== 'test',
    );
  }

  private canUseGemini(): boolean {
    return Boolean(
      this.geminiApiKey &&
        this.geminiApiKey !== 'xxx' &&
        process.env.NODE_ENV !== 'test',
    );
  }

  private canUseOpenAi(): boolean {
    return Boolean(
      this.openAiApiKey &&
        this.openAiApiKey !== 'xxx' &&
        process.env.NODE_ENV !== 'test',
    );
  }
}
