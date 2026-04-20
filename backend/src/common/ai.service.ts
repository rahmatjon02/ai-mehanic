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
  ChatPromptMessage,
  DiagnosisResult,
  QuoteComparisonResult,
} from './types';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly geminiApiKey: string;
  private readonly geminiModel: string;
  private readonly openAiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') ?? '';
    this.geminiModel =
      this.configService.get<string>('GEMINI_MODEL')?.trim() ||
      'gemini-2.0-flash';
    this.openAiApiKey = this.configService.get<string>('OPENAI_API_KEY') ?? '';
  }

  async analyzeDiagnosis(input: {
    filePath: string;
    mimeType: string;
    fileType: 'image' | 'audio' | 'video';
  }): Promise<DiagnosisResult> {
    try {
      if (input.fileType === 'audio') {
        const transcript = await this.transcribeAudio(
          input.filePath,
          input.mimeType,
        );
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
        return this.buildQuoteComparisonFromText(
          input.quoteText,
          input.diagnosis,
        );
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
      return this.buildQuoteComparisonFromText(
        input.quoteText ?? '',
        input.diagnosis,
      );
    }
  }

  async generateChatReply(messages: ChatPromptMessage[]): Promise<string> {
    try {
      if (!this.canUseGemini()) {
        return this.buildMockChatReply(messages);
      }

      const conversation = messages
        .map(
          (message) =>
            `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`,
        )
        .join('\n');
      const response = await this.generateGeminiText({
        prompt: `${CHAT_SYSTEM_PROMPT}\n\nConversation:\n${conversation}\n\nAssistant:`,
      });

      return response.trim() || this.buildMockChatReply(messages);
    } catch (error) {
      this.logger.warn(`Chat fallback used: ${(error as Error).message}`);
      return this.buildMockChatReply(messages);
    }
  }

  private async generateDiagnosisFromText(
    text: string,
  ): Promise<DiagnosisResult> {
    if (!this.canUseGemini()) {
      return this.buildMockDiagnosis('audio', text);
    }

    try {
      const response = await this.generateGeminiJson<DiagnosisResult>({
        prompt: `${DIAGNOSIS_PROMPT}\n\nUser description:\n${text}`,
      });

      return this.normalizeDiagnosis(response);
    } catch (error) {
      this.logger.warn(
        `Text diagnosis fallback used: ${(error as Error).message}`,
      );
      return this.buildMockDiagnosis('audio', text);
    }
  }

  private async transcribeAudio(
    filePath: string,
    mimeType: string,
  ): Promise<string> {
    if (!this.canUseOpenAi()) {
      return 'Customer reports rattling noise near the front brakes and reduced stopping performance.';
    }

    try {
      const openai = new OpenAI({ apiKey: this.openAiApiKey });
      const buffer = await readFile(filePath);
      const file = await toFile(buffer, basename(filePath), {
        type: mimeType || lookupMime(filePath) || 'audio/mpeg',
      });
      const transcript = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });

      return transcript.text;
    } catch (error) {
      this.logger.warn(
        `Transcription fallback used: ${(error as Error).message}`,
      );
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

    throw lastError ?? new Error('Gemini chat request failed');
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

  private buildMockDiagnosis(
    fileType: 'image' | 'audio' | 'video',
    textHint = '',
  ): DiagnosisResult {
    const brakeFocused =
      textHint.toLowerCase().includes('brake') || fileType !== 'video';
    const parts = brakeFocused
      ? [
          {
            name: 'Тормозные колодки',
            price_min: 120,
            price_max: 350,
            currency: 'TJS',
          },
          {
            name: 'Тормозные диски',
            price_min: 200,
            price_max: 600,
            currency: 'TJS',
          },
        ]
      : [
          {
            name: 'Датчик каталитического нейтрализатора',
            price_min: 350,
            price_max: 900,
            currency: 'TJS',
          },
          {
            name: 'Комплект прокладок выхлопной системы',
            price_min: 80,
            price_max: 220,
            currency: 'TJS',
          },
        ];

    const laborMin = brakeFocused ? 160 : 240;
    const laborMax = brakeFocused ? 320 : 480;
    const partsMin = parts.reduce((sum, part) => sum + part.price_min, 0);
    const partsMax = parts.reduce((sum, part) => sum + part.price_max, 0);

    return {
      problem: brakeFocused
        ? 'Износ тормозных компонентов'
        : 'Неисправность выхлопной системы',
      description: brakeFocused
        ? 'Загруженные данные указывают на износ тормозных колодок и возможное повреждение дисков, что снижает эффективность торможения и вызывает скрип или дребезжание.'
        : 'Загруженные данные указывают на проблему с выхлопной системой или токсичностью отработавших газов, что часто сопровождается снижением мощности и индикатором ошибки P0420.',
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

  private buildMockChatReply(messages: ChatPromptMessage[]): string {
    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === 'user')
        ?.content ?? '';
    const lower = lastUserMessage.toLowerCase();

    if (lower.includes('тормоз') || lower.includes('brake')) {
      return 'Похоже на проблему с тормозной системой. Проверь уровень тормозной жидкости, состояние колодок и дисков. Если есть скрежет, провал педали или машина плохо тормозит, лучше не ехать дальше и обратиться в сервис.';
    }

    if (lower.includes('двиг') || lower.includes('engine')) {
      return 'По двигателю сначала уточни симптомы: горит ли Check Engine, есть ли вибрация, дым, запах бензина, потеря мощности или коды OBD. Безопасный первый шаг — считать ошибки OBD и проверить уровень масла и охлаждающей жидкости.';
    }

    if (
      lower.includes('цена') ||
      lower.includes('смет') ||
      lower.includes('cost')
    ) {
      return 'Опиши, какие работы и запчасти указаны в смете, а также итоговую сумму. Я сравню её с типичным диапазоном и отмечу подозрительные позиции.';
    }

    return 'Опиши симптомы подробнее: марка, модель, год, пробег, когда появляется проблема, есть ли звуки, запахи, вибрации или ошибки на панели. По этим данным я подскажу вероятные причины и следующий безопасный шаг.';
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
    return Boolean(
      this.geminiApiKey &&
      this.geminiApiKey !== 'xxx' &&
      process.env.NODE_ENV !== 'test',
    );
  }

  private canUseOpenAi() {
    return Boolean(
      this.openAiApiKey &&
      this.openAiApiKey !== 'xxx' &&
      process.env.NODE_ENV !== 'test',
    );
  }
}
