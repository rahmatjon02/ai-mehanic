import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly config: ConfigService) {}

  async getDiagnostics() {
    const timestamp = new Date().toISOString();
    const [db, groq, openai, gemini, nhtsa] = await Promise.all([
      this.checkDb(),
      this.checkGroq(),
      this.checkOpenAi(),
      this.checkGemini(),
      this.checkNhtsa(),
    ]);

    const aiAvailable = groq || openai || gemini;

    return {
      db,
      ai: { groq, openai, gemini },
      nhtsa,
      allSystemsGo: db && aiAvailable,
      timestamp,
    };
  }

  private async checkDb(): Promise<boolean> {
    const prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      this.logger.warn(`DB health check failed: ${(err as Error).message}`);
      return false;
    } finally {
      await prisma.$disconnect();
    }
  }

  private async checkGroq(): Promise<boolean> {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (!key || key === 'xxx') return false;
    try {
      const groq = new Groq({ apiKey: key });
      const res = await groq.chat.completions.create({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return Boolean(res.choices[0]?.message?.content);
    } catch (err) {
      this.logger.warn(`Groq health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  private async checkOpenAi(): Promise<boolean> {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (!key || key === 'xxx') return false;
    try {
      const openai = new OpenAI({ apiKey: key });
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      return Boolean(res.choices[0]?.message?.content);
    } catch (err) {
      this.logger.warn(`OpenAI health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  private async checkGemini(): Promise<boolean> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key || key === 'xxx') return false;
    try {
      const gemini = new GoogleGenerativeAI(key);
      const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent('ping');
      return Boolean(result.response.text());
    } catch (err) {
      this.logger.warn(`Gemini health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  private async checkNhtsa(): Promise<boolean> {
    try {
      const res = await fetch(
        'https://vpic.api.nhtsa.dot.gov/api/vehicles/DecodeVin/1HGCM82633A004352?format=json',
        { signal: AbortSignal.timeout(10000) },
      );
      return res.ok;
    } catch (err) {
      this.logger.warn(`NHTSA health check failed: ${(err as Error).message}`);
      return false;
    }
  }
}
