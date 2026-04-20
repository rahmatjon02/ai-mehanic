import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly config: ConfigService) {}

  async getDiagnostics() {
    const timestamp = new Date().toISOString();
    const [db, gemini, nhtsa] = await Promise.all([
      this.checkDb(),
      this.checkGemini(),
      this.checkNhtsa(),
    ]);

    return {
      db,
      gemini,
      nhtsa,
      allSystemsGo: db && gemini && nhtsa,
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
        { signal: AbortSignal.timeout(8000) },
      );
      return res.ok;
    } catch (err) {
      this.logger.warn(`NHTSA health check failed: ${(err as Error).message}`);
      return false;
    }
  }
}
