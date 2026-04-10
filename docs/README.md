# AI Mechanic MVP

## Stack

- Backend: NestJS + Prisma client + PostgreSQL
- Mobile: Expo React Native (SDK 51)
- AI: Gemini 1.5 Flash with safe JSON parsing and offline fallbacks for local development/tests
- Audio transcription: OpenAI Whisper with safe fallback when keys are missing

## Run backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run build
npm run test:e2e
npm run start:dev
```

Backend runs on `http://localhost:3000`.

## Run mobile

```bash
cd mobile
npm install
npm start
```

The mobile app reads `EXPO_PUBLIC_API_URL` from [`mobile/.env`](/c:/Desktop/AI%20Mehanic/mobile/.env). For a real device, replace `localhost` with your computer's LAN IP.

## Main flows

- Upload photo, video, or recorded audio from Home
- View diagnosis, severity, cost range, and parts
- Compare mechanic quote via image or text
- Browse mock part prices from three stores
- Open History and revisit previous diagnoses
- Use mock OBD data to boost diagnosis confidence

## Notes

- Backend is now configured for PostgreSQL via [`backend/prisma/schema.prisma`](/c:/Desktop/AI%20Mehanic/backend/prisma/schema.prisma).
- Main connection string lives in [`backend/.env`](/c:/Desktop/AI%20Mehanic/backend/.env).
- If you prefer manual SQL instead of Prisma push, use [`backend/prisma/init-postgres.sql`](/c:/Desktop/AI%20Mehanic/backend/prisma/init-postgres.sql).
- E2E coverage includes all 10 required scenarios from the brief.
- If `GEMINI_API_KEY` and `OPENAI_API_KEY` are set, real AI calls are used. Without keys, the app still works with deterministic fallback responses for demo/testing.
