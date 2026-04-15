# Deploy AI Mechanic

## Recommended setup

- Backend: Render Web Service
- Database: Neon Postgres or Supabase Postgres
- Mobile app: Expo, with `EXPO_PUBLIC_API_URL` pointed to the deployed backend

This project has two separate parts:

1. `backend` is the API that must be deployed to a server.
2. `mobile` is the Expo app that calls that API.

## 1. Create the Postgres database

Use Neon or Supabase and copy the external connection string.

Expected format:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ai_mechanic?schema=public
```

## 2. Deploy the backend on Render

Create a new **Web Service** from the GitHub repository and use these settings:

- Root Directory: `backend`
- Build Command: `npm install && npm run prisma:generate && npm run build`
- Start Command: `npm run prisma:push && npm run start:prod`

Environment variables:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ai_mechanic?schema=public
PORT=10000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=
```

Notes:

- `PORT` is set by Render automatically, but adding it in the dashboard is harmless.
- `GEMINI_API_KEY` and `OPENAI_API_KEY` are optional. Without them the backend falls back to deterministic mock responses, which is enough for demos and testing.
- Prisma uses `DATABASE_URL` from the environment and the schema is in `backend/prisma/schema.prisma`.

After deploy, open:

```text
https://your-service-name.onrender.com/api-docs
```

If Swagger opens, the API is alive.

## 3. Point the Expo app to the deployed backend

Create `mobile/.env` from `mobile/.env.example` and set:

```env
EXPO_PUBLIC_API_URL=https://your-service-name.onrender.com
```

Then start Expo again:

```bash
cd mobile
npm install
npm start
```

## 4. Quick backend smoke test

Test the root endpoint in a browser or terminal:

```bash
curl https://your-service-name.onrender.com
```

Then test Swagger:

```text
https://your-service-name.onrender.com/api-docs
```

## 5. Local fallback

If you want to run it locally before deploying:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

Backend default local URL:

```text
http://localhost:3000
```
