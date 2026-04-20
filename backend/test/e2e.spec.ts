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

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  };
}

interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
}

interface ChatSessionDetails {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
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
    await prisma.chatMessage.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.car.deleteMany();
    await prisma.user.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.diagnosis.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.chatMessage.deleteMany();
      await prisma.chatSession.deleteMany();
      await prisma.car.deleteMany();
      await prisma.user.deleteMany();
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

  const registerUser = async (email: string, name = 'Test User') => {
    const response = await request(getServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Password123!',
        name,
      })
      .expect(201);
    const body = asBody<ApiSuccessResponse<AuthResponse>>(response.body);

    expect(body.success).toBe(true);
    return body.data;
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

  it('11. Register + login + profile endpoints work with JWT auth', async () => {
    const email = `tester_${Date.now()}@example.com`;
    const registered = await registerUser(email, 'Rahmat');

    const loginResponse = await request(getServer())
      .post('/auth/login')
      .send({
        email,
        password: 'Password123!',
      })
      .expect(201);
    const loginBody = asBody<ApiSuccessResponse<AuthResponse>>(
      loginResponse.body,
    );

    expect(loginBody.success).toBe(true);
    expect(loginBody.data.user.email).toBe(email);

    const profileResponse = await request(getServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${registered.access_token}`)
      .expect(200);

    const profileBody = asBody<
      ApiSuccessResponse<{
        id: string;
        email: string;
        name: string;
        avatar: string | null;
      }>
    >(profileResponse.body);

    expect(profileBody.success).toBe(true);
    expect(profileBody.data.email).toBe(email);

    const patchResponse = await request(getServer())
      .patch('/auth/profile')
      .set('Authorization', `Bearer ${registered.access_token}`)
      .send({
        name: 'Rahmat Updated',
        avatar: 'https://example.com/avatar.png',
      })
      .expect(200);

    const patchBody = asBody<
      ApiSuccessResponse<{
        id: string;
        name: string;
        avatar: string | null;
      }>
    >(patchResponse.body);

    expect(patchBody.success).toBe(true);
    expect(patchBody.data.name).toBe('Rahmat Updated');
    expect(patchBody.data.avatar).toContain('avatar.png');
  });

  it('12. Cars endpoints create, list and delete user cars', async () => {
    const auth = await registerUser(`cars_${Date.now()}@example.com`, 'Cars QA');

    const createResponse = await request(getServer())
      .post('/cars')
      .set('Authorization', `Bearer ${auth.access_token}`)
      .send({
        vin: '1HGCM82633A004352',
        make: 'Honda',
        model: 'Accord',
        year: 2012,
        bodyType: 'Sedan',
        engineSize: '2.4',
      })
      .expect(201);

    const createdCar = asBody<
      ApiSuccessResponse<{ id: string; make: string; model: string }>
    >(createResponse.body);

    expect(createdCar.success).toBe(true);
    expect(createdCar.data.make).toBe('Honda');

    const listResponse = await request(getServer())
      .get('/cars')
      .set('Authorization', `Bearer ${auth.access_token}`)
      .expect(200);

    const listBody = asBody<
      ApiSuccessResponse<Array<{ id: string; make: string; model: string }>>
    >(listResponse.body);

    expect(listBody.success).toBe(true);
    expect(listBody.data.some((car) => car.id === createdCar.data.id)).toBe(
      true,
    );

    const deleteResponse = await request(getServer())
      .delete(`/cars/${createdCar.data.id}`)
      .set('Authorization', `Bearer ${auth.access_token}`)
      .expect(200);

    const deleteBody = asBody<ApiSuccessResponse<{ id: string }>>(
      deleteResponse.body,
    );

    expect(deleteBody.success).toBe(true);
    expect(deleteBody.data.id).toBe(createdCar.data.id);
  });

  it('13. Chat endpoints create session, send message, list and delete session', async () => {
    const auth = await registerUser(`chat_${Date.now()}@example.com`, 'Chat QA');

    const createResponse = await request(getServer())
      .post('/chat/sessions')
      .set('Authorization', `Bearer ${auth.access_token}`)
      .send({ title: 'Brake noise' })
      .expect(201);

    const createBody = asBody<
      ApiSuccessResponse<{ id: string; title: string; messages: unknown[] }>
    >(createResponse.body);

    expect(createBody.success).toBe(true);
    expect(createBody.data.title).toBe('Brake noise');

    const messageResponse = await request(getServer())
      .post(`/chat/sessions/${createBody.data.id}/messages`)
      .set('Authorization', `Bearer ${auth.access_token}`)
      .field('content', 'У меня шум при торможении')
      .expect(201);

    const messageBody = asBody<
      ApiSuccessResponse<{
        userMessage: { role: string; content: string };
        assistantMessage: { role: string; content: string };
      }>
    >(messageResponse.body);

    expect(messageBody.success).toBe(true);
    expect(messageBody.data.userMessage.role).toBe('user');
    expect(messageBody.data.assistantMessage.role).toBe('assistant');

    const listResponse = await request(getServer())
      .get('/chat/sessions')
      .set('Authorization', `Bearer ${auth.access_token}`)
      .expect(200);

    const listBody = asBody<ApiSuccessResponse<ChatSessionSummary[]>>(
      listResponse.body,
    );

    expect(listBody.success).toBe(true);
    expect(listBody.data.some((s) => s.id === createBody.data.id)).toBe(true);

    const detailsResponse = await request(getServer())
      .get(`/chat/sessions/${createBody.data.id}`)
      .set('Authorization', `Bearer ${auth.access_token}`)
      .expect(200);

    const detailsBody = asBody<ApiSuccessResponse<ChatSessionDetails>>(
      detailsResponse.body,
    );

    expect(detailsBody.success).toBe(true);
    expect(detailsBody.data.messages).toHaveLength(2);

    const deleteResponse = await request(getServer())
      .delete(`/chat/sessions/${createBody.data.id}`)
      .set('Authorization', `Bearer ${auth.access_token}`)
      .expect(200);

    const deleteBody = asBody<ApiSuccessResponse<{ id: string }>>(
      deleteResponse.body,
    );

    expect(deleteBody.success).toBe(true);
    expect(deleteBody.data.id).toBe(createBody.data.id);
  });

  it('14. VIN decode returns normalized vehicle data', async () => {
    const response = await request(getServer())
      .post('/vin/decode')
      .send({ vin: '1HGCM82633A004352' })
      .expect(201);

    const body = asBody<
      ApiSuccessResponse<{
        make: string;
        model: string;
        year: string;
        bodyType: string;
        engineSize: string;
      }>
    >(response.body);

    expect(body.success).toBe(true);
    expect(body.data.make).toBeTruthy();
    expect(body.data.year).toBeTruthy();
  });

  it('15. Health endpoints return app and diagnostics status payloads', async () => {
    const rootResponse = await request(getServer()).get('/').expect(200);
    const rootBody = asBody<
      ApiSuccessResponse<{ name: string; status: string }>
    >(rootResponse.body);

    expect(rootBody.success).toBe(true);
    expect(rootBody.data.status).toBe('ok');

    const diagnosticsResponse = await request(getServer())
      .get('/health/diagnostics')
      .expect(200);
    const diagnosticsBody = asBody<
      ApiSuccessResponse<{
        db: boolean;
        gemini: boolean;
        nhtsa: boolean;
        allSystemsGo: boolean;
        timestamp: string;
      }>
    >(diagnosticsResponse.body);

    expect(diagnosticsBody.success).toBe(true);
    expect(typeof diagnosticsBody.data.db).toBe('boolean');
    expect(typeof diagnosticsBody.data.gemini).toBe('boolean');
    expect(typeof diagnosticsBody.data.nhtsa).toBe('boolean');
    expect(typeof diagnosticsBody.data.allSystemsGo).toBe('boolean');
    expect(diagnosticsBody.data.timestamp).toBeTruthy();
  });
});
