import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';
import type {
  DiagnosisResult,
  QuoteComparisonResult,
} from '../src/common/types';
import { PrismaService } from '../src/prisma/prisma.service';

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

interface ApiErrorResponse {
  success: false;
  data: null;
  error: string;
}

interface DiagnosisResponse extends DiagnosisResult {
  diagnosisId: string;
}

interface StoredDiagnosisResponse {
  id: string;
  fileType: string;
  filePath: string;
  createdAt: string;
  userId: string | null;
  carId: string | null;
  result: DiagnosisResult;
  quotes: Array<{ id: string }>;
}

interface PricesResponse {
  parts: Array<{
    name: string;
    sources: Array<{
      store: string;
      price: number;
      url: string;
      availability: string;
    }>;
  }>;
}

const TEST_DATABASE_URL =
  'postgresql://postgres:rahmatjon2002@localhost:5432/ai_mechanic_test?schema=public';

const asBody = <T>(value: unknown): T => value as T;

jest.setTimeout(30000);

describe('AI Mechanic E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const getServer = (): Parameters<typeof request>[0] =>
    app.getHttpServer() as Parameters<typeof request>[0];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const runtimeDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL?.replace(
        '/ai_mechanic?',
        '/ai_mechanic_test?',
      ) ??
      TEST_DATABASE_URL;
    process.env.DATABASE_URL = runtimeDatabaseUrl;

    execSync('npx prisma db push --skip-generate', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: runtimeDatabaseUrl },
      stdio: 'pipe',
    });

    const uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.quote.deleteMany();
    await prisma.diagnosis.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.quote.deleteMany();
      await prisma.diagnosis.deleteMany();
    }

    const uploadDir = join(process.cwd(), 'uploads');
    if (existsSync(uploadDir)) {
      rmSync(uploadDir, { recursive: true, force: true });
    }

    if (app) {
      await app.close();
    }
  });

  const createDiagnosis = async (
    filename: string,
    mimeType: string,
    type?: string,
  ): Promise<string> => {
    const response = await request(getServer())
      .post(`/diagnosis/analyze${type ? `?type=${type}` : ''}`)
      .attach('file', Buffer.from('mock file payload'), {
        filename,
        contentType: mimeType,
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<DiagnosisResponse>>(response.body);

    expect(body.success).toBe(true);
    return body.data.diagnosisId;
  };

  it('1. Upload jpg image -> returns diagnosis JSON', async () => {
    const response = await request(getServer())
      .post('/diagnosis/analyze?type=image')
      .attach('file', Buffer.from('fake image'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<DiagnosisResponse>>(response.body);

    expect(body.success).toBe(true);
    expect(body.data.problem).toBeDefined();
    expect(body.data.diagnosisId).toBeDefined();
  });

  it('2. Upload mp3 audio -> returns diagnosis JSON', async () => {
    const response = await request(getServer())
      .post('/diagnosis/analyze?type=audio')
      .attach('file', Buffer.from('fake audio'), {
        filename: 'noise.mp3',
        contentType: 'audio/mpeg',
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<DiagnosisResponse>>(response.body);

    expect(body.success).toBe(true);
    expect(body.data.problem).toBeDefined();
  });

  it('3. Upload mp4 video -> returns diagnosis JSON', async () => {
    const response = await request(getServer())
      .post('/diagnosis/analyze?type=video')
      .attach('file', Buffer.from('fake video'), {
        filename: 'issue.mp4',
        contentType: 'video/mp4',
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<DiagnosisResponse>>(response.body);

    expect(body.success).toBe(true);
    expect(body.data.severity).toBeDefined();
  });

  it('4. Missing file -> returns 400 error', async () => {
    const response = await request(getServer())
      .post('/diagnosis/analyze')
      .expect(400);
    const body = asBody<ApiErrorResponse>(response.body);

    expect(body.success).toBe(false);
    expect(body.error).toContain('File is required');
  });

  it('5. Get prices for valid diagnosisId -> returns 3 sources per part', async () => {
    const diagnosisId = await createDiagnosis(
      'prices.jpg',
      'image/jpeg',
      'image',
    );

    const response = await request(getServer())
      .get(`/prices/${diagnosisId}`)
      .expect(200);
    const body = asBody<ApiSuccessResponse<PricesResponse>>(response.body);

    expect(body.success).toBe(true);
    expect(body.data.parts.length).toBeGreaterThan(0);
    expect(body.data.parts[0].sources).toHaveLength(3);
  });

  it('6. Get prices for invalid id -> returns 404', async () => {
    const response = await request(getServer())
      .get('/prices/invalid-id')
      .expect(404);
    const body = asBody<ApiErrorResponse>(response.body);

    expect(body.success).toBe(false);
    expect(body.error).toContain('Diagnosis not found');
  });

  it('7. Upload quote image -> returns verdict', async () => {
    const diagnosisId = await createDiagnosis(
      'quote-base.jpg',
      'image/jpeg',
      'image',
    );

    const response = await request(getServer())
      .post(`/quote/check/${diagnosisId}`)
      .attach('file', Buffer.from('fake quote image'), {
        filename: 'quote.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<QuoteComparisonResult>>(
      response.body,
    );

    expect(body.success).toBe(true);
    expect(body.data.verdict).toBeDefined();
  });

  it('8. Submit overpriced quote -> verdict = "overpriced"', async () => {
    const diagnosisId = await createDiagnosis(
      'expensive.jpg',
      'image/jpeg',
      'image',
    );

    const response = await request(getServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', 'Brake job total: 9999')
      .expect(201);
    const body = asBody<ApiSuccessResponse<QuoteComparisonResult>>(
      response.body,
    );

    expect(body.success).toBe(true);
    expect(body.data.verdict).toBe('overpriced');
  });

  it('9. Submit fair quote -> verdict = "fair"', async () => {
    const diagnosisId = await createDiagnosis(
      'fair.jpg',
      'image/jpeg',
      'image',
    );

    const diagnosisResponse = await request(getServer())
      .get(`/diagnosis/${diagnosisId}`)
      .expect(200);
    const diagnosisBody = asBody<ApiSuccessResponse<StoredDiagnosisResponse>>(
      diagnosisResponse.body,
    );

    const fairMin = diagnosisBody.data.result.total_cost_min;
    const fairMax = diagnosisBody.data.result.total_cost_max;
    const fairTotal = Math.round((fairMin + fairMax) / 2);

    const response = await request(getServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', `Estimated total ${fairTotal}`)
      .expect(201);
    const body = asBody<ApiSuccessResponse<QuoteComparisonResult>>(
      response.body,
    );

    expect(body.success).toBe(true);
    expect(body.data.verdict).toBe('fair');
  });

  it('10. Full flow: diagnose -> check quote -> get prices (all 200)', async () => {
    const diagnoseResponse = await request(getServer())
      .post('/diagnosis/analyze?type=image')
      .attach('file', Buffer.from('full flow image'), {
        filename: 'flow.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const diagnoseBody = asBody<ApiSuccessResponse<DiagnosisResponse>>(
      diagnoseResponse.body,
    );
    const diagnosisId = diagnoseBody.data.diagnosisId;

    const quoteResponse = await request(getServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', 'Repair total 450')
      .expect(201);
    const quoteBody = asBody<ApiSuccessResponse<QuoteComparisonResult>>(
      quoteResponse.body,
    );

    const pricesResponse = await request(getServer())
      .get(`/prices/${diagnosisId}`)
      .expect(200);
    const pricesBody = asBody<ApiSuccessResponse<PricesResponse>>(
      pricesResponse.body,
    );

    expect(diagnoseBody.success).toBe(true);
    expect(quoteBody.success).toBe(true);
    expect(pricesBody.success).toBe(true);
  });
});
