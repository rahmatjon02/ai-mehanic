import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { AllExceptionsFilter } from '../src/common/http-exception.filter';

describe('AI Mechanic E2E', () => {
  let app: INestApplication;
  let prisma: any;
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const runtimeDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL?.replace('/ai_mechanic?', '/ai_mechanic_test?') ??
      'postgresql://postgres:rahmatjon2002@localhost:5432/ai_mechanic_test?schema=public';
    process.env.DATABASE_URL = runtimeDatabaseUrl;

    const uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const appModuleRef = require('../src/app.module');
    const prismaModuleRef = require('../src/prisma/prisma.service');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [appModuleRef.AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(prismaModuleRef.PrismaService);
    await prisma.quote.deleteMany();
    await prisma.diagnosis.deleteMany();
  });

  afterAll(async () => {
    await prisma.quote.deleteMany();
    await prisma.diagnosis.deleteMany();

    const uploadDir = join(process.cwd(), 'uploads');
    if (existsSync(uploadDir)) {
      rmSync(uploadDir, { recursive: true, force: true });
    }

    await app.close();
  });

  const createDiagnosis = async (filename: string, mimeType: string, type?: string) => {
    const req = request(app.getHttpServer())
      .post(`/diagnosis/analyze${type ? `?type=${type}` : ''}`)
      .attach('file', Buffer.from('mock file payload'), {
        filename,
        contentType: mimeType,
      });

    const response = await req.expect(201);
    expect(response.body.success).toBe(true);
    return response.body.data.diagnosisId as string;
  };

  it('1. Upload jpg image -> returns diagnosis JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/diagnosis/analyze?type=image')
      .attach('file', Buffer.from('fake image'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.problem).toBeDefined();
    expect(response.body.data.diagnosisId).toBeDefined();
  });

  it('2. Upload mp3 audio -> returns diagnosis JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/diagnosis/analyze?type=audio')
      .attach('file', Buffer.from('fake audio'), {
        filename: 'noise.mp3',
        contentType: 'audio/mpeg',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.problem).toBeDefined();
  });

  it('3. Upload mp4 video -> returns diagnosis JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/diagnosis/analyze?type=video')
      .attach('file', Buffer.from('fake video'), {
        filename: 'issue.mp4',
        contentType: 'video/mp4',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.severity).toBeDefined();
  });

  it('4. Missing file -> returns 400 error', async () => {
    const response = await request(app.getHttpServer())
      .post('/diagnosis/analyze')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('File is required');
  });

  it('5. Get prices for valid diagnosisId -> returns 3 sources per part', async () => {
    const diagnosisId = await createDiagnosis('prices.jpg', 'image/jpeg', 'image');

    const response = await request(app.getHttpServer())
      .get(`/prices/${diagnosisId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.parts.length).toBeGreaterThan(0);
    expect(response.body.data.parts[0].sources).toHaveLength(3);
  });

  it('6. Get prices for invalid id -> returns 404', async () => {
    const response = await request(app.getHttpServer())
      .get('/prices/invalid-id')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Diagnosis not found');
  });

  it('7. Upload quote image -> returns verdict', async () => {
    const diagnosisId = await createDiagnosis('quote-base.jpg', 'image/jpeg', 'image');

    const response = await request(app.getHttpServer())
      .post(`/quote/check/${diagnosisId}`)
      .attach('file', Buffer.from('fake quote image'), {
        filename: 'quote.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.verdict).toBeDefined();
  });

  it('8. Submit overpriced quote -> verdict = "overpriced"', async () => {
    const diagnosisId = await createDiagnosis('expensive.jpg', 'image/jpeg', 'image');

    const response = await request(app.getHttpServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', 'Brake job total: 9999')
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.verdict).toBe('overpriced');
  });

  it('9. Submit fair quote -> verdict = "fair"', async () => {
    const diagnosisId = await createDiagnosis('fair.jpg', 'image/jpeg', 'image');

    const diagnosisResponse = await request(app.getHttpServer())
      .get(`/diagnosis/${diagnosisId}`)
      .expect(200);

    const fairMin = diagnosisResponse.body.data.result.total_cost_min as number;
    const fairMax = diagnosisResponse.body.data.result.total_cost_max as number;
    const fairTotal = Math.round((fairMin + fairMax) / 2);

    const response = await request(app.getHttpServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', `Estimated total ${fairTotal}`)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.verdict).toBe('fair');
  });

  it('10. Full flow: diagnose -> check quote -> get prices (all 200)', async () => {
    const diagnoseResponse = await request(app.getHttpServer())
      .post('/diagnosis/analyze?type=image')
      .attach('file', Buffer.from('full flow image'), {
        filename: 'flow.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const diagnosisId = diagnoseResponse.body.data.diagnosisId as string;

    const quoteResponse = await request(app.getHttpServer())
      .post(`/quote/check/${diagnosisId}`)
      .field('quoteText', 'Repair total 450')
      .expect(201);

    const pricesResponse = await request(app.getHttpServer())
      .get(`/prices/${diagnosisId}`)
      .expect(200);

    expect(diagnoseResponse.body.success).toBe(true);
    expect(quoteResponse.body.success).toBe(true);
    expect(pricesResponse.body.success).toBe(true);
  });
});
