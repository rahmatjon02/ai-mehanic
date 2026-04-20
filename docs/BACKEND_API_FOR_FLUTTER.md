# AI Mechanic Backend API For Flutter

Last verified: 2026-04-20

Automated status:
- `backend` e2e tests passed: 15/15
- Verified by tests: `auth`, `cars`, `chat`, `diagnosis`, `quote`, `prices`, `vin`, `health`
- Special flow: Google web OAuth endpoints exist, but they require a browser/OAuth redirect flow and were not fully covered by local e2e tests

## Base URL

Local:

```text
http://localhost:3006
```

Swagger:

```text
http://localhost:3006/api-docs
```

## Common Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

## Auth Header

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

## 1. Root Health Check

### `GET /`

Purpose: simple backend ping.

Auth: no

Response:

```json
{
  "success": true,
  "data": {
    "name": "AI Mechanic Backend",
    "status": "ok"
  }
}
```

Flutter note: use this for splash/startup ping only.

## 2. Auth

### `POST /auth/register`

Purpose: register user by email/password.

Auth: no

Body:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "Rahmat"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Rahmat",
      "avatar": null
    }
  }
}
```

Flutter note: save `access_token` immediately after registration.

### `POST /auth/login`

Purpose: login by email/password.

Auth: no

Body:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Response: same shape as `/auth/register`.

### `POST /auth/google`

Purpose: mobile Google sign-in with Google access token.

Auth: no

Body:

```json
{
  "accessToken": "google_access_token"
}
```

Response: same shape as `/auth/register`.

Flutter note: use after Google Sign-In on mobile when you already have Google access token.

### `GET /auth/google/web`

Purpose: start browser-based Google OAuth flow.

Auth: no

Flutter note: mainly for web/browser redirect flow, not normal mobile JSON auth.

### `GET /auth/google/callback`

Purpose: OAuth callback endpoint.

Auth: no

Behavior: redirects to:

```text
aimechanic://auth?token=<jwt>
```

Flutter note: configure deep link handling if using this flow.

### `GET /auth/profile`

Purpose: get current user profile.

Auth: yes

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Rahmat",
    "avatar": null,
    "createdAt": "2026-04-20T05:00:00.000Z",
    "_count": {
      "diagnoses": 0
    }
  }
}
```

### `PATCH /auth/profile`

Purpose: update profile.

Auth: yes

Body:

```json
{
  "name": "New Name",
  "avatar": "https://example.com/avatar.png"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "New Name",
    "avatar": "https://example.com/avatar.png",
    "createdAt": "2026-04-20T05:00:00.000Z"
  }
}
```

## 3. Cars

### `POST /cars`

Purpose: save a car in user profile.

Auth: yes

Body:

```json
{
  "vin": "1HGCM82633A004352",
  "make": "Honda",
  "model": "Accord",
  "year": 2012,
  "bodyType": "Sedan",
  "engineSize": "2.4"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "vin": "1HGCM82633A004352",
    "make": "Honda",
    "model": "Accord",
    "year": 2012,
    "bodyType": "Sedan",
    "engineSize": "2.4",
    "createdAt": "2026-04-20T05:00:00.000Z"
  }
}
```

### `GET /cars`

Purpose: list current user cars.

Auth: yes

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "vin": "1HGCM82633A004352",
      "make": "Honda",
      "model": "Accord",
      "year": 2012,
      "bodyType": "Sedan",
      "engineSize": "2.4",
      "createdAt": "2026-04-20T05:00:00.000Z"
    }
  ]
}
```

### `DELETE /cars/:id`

Purpose: delete user car.

Auth: yes

Response:

```json
{
  "success": true,
  "data": {
    "id": "car_uuid"
  }
}
```

## 4. VIN

### `POST /vin/decode`

Purpose: decode VIN and prefill car form.

Auth: no

Body:

```json
{
  "vin": "1HGCM82633A004352"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "make": "Honda",
    "model": "Accord",
    "year": "2003",
    "bodyType": "Sedan",
    "engineSize": "2.4"
  }
}
```

Flutter note: response may fall back to partial offline decoding when external VIN service is unavailable.

## 5. Diagnosis

### `POST /diagnosis/analyze?type=image|audio|video`

Purpose: analyze uploaded media and create diagnosis.

Auth: optional

Content-Type:

```text
multipart/form-data
```

Fields:
- `file`: binary, required
- `carId`: string, optional

Response:

```json
{
  "success": true,
  "data": {
    "diagnosisId": "uuid",
    "problem": "Проблема",
    "description": "Описание",
    "severity": "low",
    "parts_needed": [
      {
        "name": "Деталь",
        "price_min": 120,
        "price_max": 200,
        "currency": "TJS"
      }
    ],
    "labor_cost_min": 100,
    "labor_cost_max": 200,
    "total_cost_min": 220,
    "total_cost_max": 400,
    "confidence": 0.8
  }
}
```

Flutter note:
- use multipart upload
- allowed media include `jpg`, `png`, `mp3`, `wav`, `m4a`, `mp4`, `mov`, `avi`, `txt`
- backend rejects empty request with `400 File is required`

### `GET /diagnosis`

Purpose: list diagnoses.

Auth: optional

Query:
- `limit`: optional number

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fileType": "image",
      "problem": "Проблема",
      "description": "Описание",
      "severity": "high",
      "totalMin": 280,
      "totalMax": 920,
      "createdAt": "2026-04-20T05:00:00.000Z",
      "userId": "uuid",
      "carId": "uuid"
    }
  ]
}
```

Flutter note:
- with JWT: returns only current user diagnoses
- without JWT: returns public/general list

### `GET /diagnosis/:id`

Purpose: get one diagnosis with quote history.

Auth: optional, but private diagnosis can only be opened by owner

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileType": "image",
    "filePath": "uploads/file.jpg",
    "createdAt": "2026-04-20T05:00:00.000Z",
    "userId": "uuid",
    "carId": "uuid",
    "result": {
      "problem": "Проблема",
      "description": "Описание",
      "severity": "high",
      "parts_needed": [],
      "labor_cost_min": 100,
      "labor_cost_max": 200,
      "total_cost_min": 220,
      "total_cost_max": 400,
      "confidence": 0.8
    },
    "quotes": []
  }
}
```

## 6. Quote Check

### `POST /quote/check/:diagnosisId`

Purpose: compare mechanic quote with diagnosis estimate.

Auth: no

Content-Type:

```text
multipart/form-data
```

Fields:
- `file`: binary, optional
- `quoteText`: string, optional

At least one of `file` or `quoteText` is required.

Response:

```json
{
  "success": true,
  "data": {
    "mechanic_total": 9999,
    "fair_estimate_min": 280,
    "fair_estimate_max": 920,
    "verdict": "overpriced",
    "overcharge_amount": 9079,
    "overcharge_percent": 986.85,
    "explanation": "Смета ...",
    "suspicious_items": [
      "..."
    ]
  }
}
```

Flutter note:
- easiest mobile path is sending plain `quoteText`
- file upload also supported for image-based quote parsing

## 7. Prices

### `GET /prices/:diagnosisId`

Purpose: return parts prices for diagnosis.

Auth: no

Response:

```json
{
  "success": true,
  "data": {
    "parts": [
      {
        "name": "Тормозные колодки",
        "sources": [
          {
            "store": "Store 1",
            "price": 210,
            "currency": "TJS",
            "availability": "В наличии"
          }
        ]
      }
    ]
  }
}
```

Flutter note: current backend returns 3 price sources per part.

## 8. Chat

### `POST /chat/sessions`

Purpose: create AI chat session.

Auth: yes

Body:

```json
{
  "title": "Brake noise"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Brake noise",
    "createdAt": "2026-04-20T05:00:00.000Z",
    "updatedAt": "2026-04-20T05:00:00.000Z",
    "messages": []
  }
}
```

### `GET /chat/sessions`

Purpose: list user chat sessions.

Auth: yes

Query:
- `limit`: optional number

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Brake noise",
      "createdAt": "2026-04-20T05:00:00.000Z",
      "updatedAt": "2026-04-20T05:00:00.000Z",
      "lastMessage": "..."
    }
  ]
}
```

### `GET /chat/sessions/:id`

Purpose: get chat session with full message history.

Auth: yes

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "title": "Brake noise",
    "createdAt": "2026-04-20T05:00:00.000Z",
    "updatedAt": "2026-04-20T05:00:00.000Z",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "У меня шум при торможении",
        "filePath": null,
        "fileName": null,
        "fileType": null,
        "mimeType": null,
        "createdAt": "2026-04-20T05:00:00.000Z"
      },
      {
        "id": "uuid",
        "role": "assistant",
        "content": "Похоже ...",
        "filePath": null,
        "fileName": null,
        "fileType": null,
        "mimeType": null,
        "createdAt": "2026-04-20T05:00:01.000Z"
      }
    ]
  }
}
```

### `POST /chat/sessions/:id/messages`

Purpose: send chat message to AI.

Auth: yes

Content-Type:

```text
multipart/form-data
```

Fields:
- `content`: string, optional
- `file`: binary, optional

At least one of `content` or `file` is required.

Response:

```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "uuid",
      "role": "user",
      "content": "У меня шум при торможении"
    },
    "assistantMessage": {
      "id": "uuid",
      "role": "assistant",
      "content": "Похоже ..."
    }
  }
}
```

Flutter note:
- always send as multipart, even for text-only, if you want one request format for text/file
- backend can auto-create attachment text when only file is sent

### `DELETE /chat/sessions/:id`

Purpose: delete chat session.

Auth: yes

Response:

```json
{
  "success": true,
  "data": {
    "id": "session_uuid"
  }
}
```

## 9. Health Diagnostics

### `GET /health/diagnostics`

Purpose: full diagnostics for DB and integrations.

Auth: no

Response:

```json
{
  "success": true,
  "data": {
    "db": true,
    "gemini": false,
    "nhtsa": true,
    "allSystemsGo": false,
    "timestamp": "2026-04-20T05:00:00.000Z"
  }
}
```

Flutter note: good for admin/debug screen, not usually for normal user flow.

## Integration Tips For Flutter

- Keep `access_token` in secure storage.
- Add `Authorization` header only for protected endpoints.
- For uploads use `multipart/form-data`.
- For diagnosis/chat uploads, send correct MIME type when possible.
- Use `quoteText` path first for quote comparison if camera/OCR is not ready yet.
- Expect Russian text in AI-generated fields.
