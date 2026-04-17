# AI Mechanic - Полная документация проекта

## 📋 Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Технологический стек](#технологический-стек)
3. [Архитектура](#архитектура)
4. [Структура проекта](#структура-проекта)
5. [Backend](#backend)
6. [Mobile приложение](#mobile-приложение)
7. [База данных](#база-данных)
8. [API Endpoints](#api-endpoints)
9. [Основные функции](#основные-функции)
10. [Установка и запуск](#установка-и-запуск)
11. [Тестирование](#тестирование)
12. [Развертывание](#развертывание)

---

## 🎯 Обзор проекта

**AI Mechanic** - это мобильное приложение для диагностики автомобилей с использованием искусственного интеллекта. Позволяет пользователям:

- Загружать фото, видео или аудиозаписи проблем с автомобилем
- Получать AI-анализ проблемы с использованием Google Gemini 1.5 Flash
- Сравнивать предложения механиков с справедливой оценкой
- Просматривать цены на запчасти от разных магазинов
- Сохранять историю диагностик
- Использовать OBD данные для повышения точности диагностики

**Версия:** MVP (Minimum Viable Product)  
**Статус:** В активной разработке

---

## 🛠 Технологический стек

### Backend

| Компонент               | Технология                              | Версия |
| ----------------------- | --------------------------------------- | ------ |
| **Framework**           | NestJS                                  | 11.0.1 |
| **Language**            | TypeScript                              | Latest |
| **Database**            | PostgreSQL                              | Latest |
| **ORM**                 | Prisma                                  | 6.18.0 |
| **Authentication**      | JWT + Google OAuth 2.0                  | -      |
| **AI**                  | Google Generative AI (Gemini 1.5 Flash) | 0.24.1 |
| **Audio Transcription** | OpenAI Whisper                          | 6.33.0 |
| **File Upload**         | Multer                                  | 2.1.1  |
| **API Documentation**   | Swagger/OpenAPI                         | 11.2.6 |

### Mobile

| Компонент        | Технология          | Версия          |
| ---------------- | ------------------- | --------------- |
| **Framework**    | Expo + React Native | 54.0.0 / 0.81.5 |
| **Language**     | TypeScript          | 5.9.2           |
| **UI Framework** | React Native        | 0.81.5          |
| **Navigation**   | React Navigation    | 6.x             |
| **HTTP Client**  | Axios               | 1.15.0          |
| **Storage**      | AsyncStorage        | 2.2.0           |
| **Camera**       | Expo Camera         | 17.0.10         |
| **Image Picker** | Expo Image Picker   | 17.0.10         |
| **Audio**        | Expo AV             | 16.0.8          |
| **Auth**         | Expo Auth Session   | 7.0.10          |

---

## 🏗 Архитектура

### Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (Expo/React Native)           │
│  ┌──────────────┬────────────────┬──────────────┬─────────┐ │
│  │   Home       │   Diagnosis    │   Quote      │  OBD    │ │
│  │   Screen     │   Screen       │  Comparison  │ Screen  │ │
│  └──────────────┴────────────────┴──────────────┴─────────┘ │
│                           │                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │            Context (Auth, OBD, API state)                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (NestJS)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬────────────┐ │
│  │   Auth   │   Chat   │Diagnosis │  Quote   │   Prices   │ │
│  │ Module   │ Module   │  Module  │  Module  │   Module   │ │
│  └──────────┴──────────┴──────────┴──────────┴────────────┘ │
│  ┌──────────┬──────────┬──────────┐                          │
│  │   VIN    │   Cars   │  Users   │                          │
│  │ Module   │ Module   │ Module   │                          │
│  └──────────┴──────────┴──────────┘                          │
│           │                                                   │
│  ┌────────────────────────────────────────┐                 │
│  │    Common Services                     │                 │
│  │  • AIService (Gemini + Whisper)        │                 │
│  │  • FileService                         │                 │
│  │  • JsonParsingService                  │                 │
│  │  • ResponseFormatter                   │                 │
│  └────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  ┌──────┬──────┬──────────┬────────┬──────────┬──────────┐  │
│  │Users │ Cars │Diagnosis │ Quotes │ChatSession│Messages │  │
│  └──────┴──────┴──────────┴────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Flow диаграмма основного процесса

```
User Upload → Validation → AI Analysis → Format Response → Store in DB
                (Backend)   (Gemini/Whisper)  (JSON Parse)   (Prisma)
                    ↓                 ↓              ↓            ↓
                Mobile App ←── REST API ←────────────────────────┘
```

---

## 📁 Структура проекта

```
AI Mechanic/
├── backend/                          # NestJS Backend
│   ├── src/
│   │   ├── auth/                    # Authentication (JWT, Google OAuth)
│   │   ├── cars/                    # Управление автомобилями
│   │   ├── chat/                    # Chat сессии и сообщения
│   │   ├── diagnosis/               # Основной модуль диагностики
│   │   ├── prices/                  # Цены на запчасти
│   │   ├── quote/                   # Сравнение предложений механиков
│   │   ├── users/                   # Управление пользователями
│   │   ├── vin/                     # VIN декодирование
│   │   ├── common/                  # Общие сервисы
│   │   │   ├── ai.service.ts        # Gemini + Whisper интеграция
│   │   │   ├── file.util.ts         # Работа с файлами
│   │   │   ├── json.util.ts         # JSON парсинг
│   │   │   ├── response.util.ts     # Форматирование ответов
│   │   │   └── types.ts             # Типы данных
│   │   ├── prisma/                  # ORM конфигурация
│   │   ├── app.module.ts            # Главный модуль
│   │   ├── app.controller.ts        # Root контроллер
│   │   └── main.ts                  # Точка входа
│   ├── prisma/
│   │   ├── schema.prisma            # Database схема
│   │   └── init-postgres.sql        # SQL инициализация
│   ├── test/                        # E2E тесты
│   ├── uploads/                     # Загруженные файлы
│   ├── package.json
│   ├── tsconfig.json
│   └── .env                         # Environment переменные
│
├── mobile/                           # React Native Mobile App (Expo)
│   ├── src/
│   │   ├── screens/                 # Экраны приложения
│   │   │   ├── HomeScreen.tsx       # Главная с загрузкой файлов
│   │   │   ├── DiagnosisScreen.tsx  # Результаты диагностики
│   │   │   ├── QuoteScreen.tsx      # Сравнение предложений
│   │   │   ├── PricesScreen.tsx     # Цены на запчасти
│   │   │   ├── OBDScreen.tsx        # OBD данные
│   │   │   ├── ChatHistoryScreen.tsx# История чатов
│   │   │   ├── HistoryScreen.tsx    # История диагностик
│   │   │   ├── ProfileScreen.tsx    # Профиль пользователя
│   │   │   ├── LoginScreen.tsx      # Вход
│   │   │   ├── RegisterScreen.tsx   # Регистрация
│   │   │   ├── ChatScreen.tsx       # Чат интерфейс
│   │   │   └── VinScreen.tsx        # VIN ввод
│   │   ├── components/              # Переиспользуемые компоненты
│   │   │   ├── GradientCard.tsx     # Карточка с градиентом
│   │   │   ├── LoaderDots.tsx       # Анимированный загрузчик
│   │   │   └── StatusBadge.tsx      # Badge статуса
│   │   ├── context/                 # React Context
│   │   │   ├── auth-context.tsx     # Auth состояние
│   │   │   └── obd-context.tsx      # OBD данные состояние
│   │   ├── services/
│   │   │   └── api.ts               # HTTP клиент (Axios)
│   │   ├── theme/
│   │   │   └── index.ts             # Цветовая схема, стили
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript типы
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx     # Навигация структура
│   │   └── App.tsx                  # Root компонент
│   ├── assets/                      # Изображения, шрифты
│   ├── package.json
│   ├── app.json                     # Expo конфигурация
│   ├── .env                         # Environment переменные
│   └── tsconfig.json
│
├── docs/
│   ├── README.md                    # Общая документация
│   └── DEPLOY.md                    # Инструкции развертывания
│
└── PROJECT.md                       # Этот файл
```

---

## 🔙 Backend

### Модули и их ответственность

#### 1. **Auth Module** (`auth/`)

**Ответственность:** Аутентификация и авторизация пользователей

**Компоненты:**

- `auth.service.ts` - Логика аутентификации (JWT генерация, Refresh токены)
- `auth.controller.ts` - Endpoints: `/auth/login`, `/auth/register`, `/auth/refresh`
- `jwt.strategy.ts` - JWT Passport стратегия
- `google.strategy.ts` - Google OAuth 2.0 стратегия
- `jwt-auth.guard.ts` - Guard для защиты JWT-только endpoints
- `google-auth.guard.ts` - Guard для Google OAuth
- `optional-jwt.guard.ts` - Guard для опциональной JWT защиты
- `current-user.decorator.ts` - Decorator для получения текущего пользователя

**Endpoints:**

```
POST /auth/register              - Регистрация нового пользователя
POST /auth/login                 - Вход по email/password
POST /auth/refresh               - Обновление JWT токена
GET  /auth/google               - Google OAuth redirect
GET  /auth/google/callback      - Google OAuth callback
```

#### 2. **Users Module** (`users/`)

**Ответственность:** Управление профилем пользователя

**Компоненты:**

- `users.service.ts` - CRUD операции для пользователей
- `users.module.ts` - Экспорт в других модулях

**Endpoints:**

```
GET  /users/profile              - Получить профиль текущего пользователя
PUT  /users/profile              - Обновить профиль
GET  /users/:id                  - Получить пользователя по ID
```

#### 3. **Diagnosis Module** (`diagnosis/`)

**Ответственность:** Анализ проблем автомобилей с использованием AI

**Компоненты:**

- `diagnosis.service.ts` - Загрузка файлов, вызов AI Gemini, сохранение результатов
- `diagnosis.controller.ts` - Endpoints для диагностики
- **Поддерживаемые типы файлов:** фото (JPG, PNG), видео (MP4, MOV), аудио (MP3, WAV)

**Endpoints:**

```
POST /diagnosis/upload           - Загрузить файл для диагностики
GET  /diagnosis/:id              - Получить результаты диагностики
GET  /diagnosis/user/all         - Список всех диагностик пользователя
DELETE /diagnosis/:id            - Удалить диагностику
```

**AI Prompt:**

```
Анализирует загруженный файл (фото/видео/аудио) и возвращает JSON:
{
  "problem": "название проблемы",
  "description": "подробное описание",
  "severity": "low|medium|high",
  "parts_needed": [...],
  "labor_cost_min": число,
  "labor_cost_max": число,
  "total_cost_min": число,
  "total_cost_max": число,
  "confidence": 0.0-1.0
}
```

#### 4. **Quote Module** (`quote/`)

**Ответственность:** Сравнение предложений механиков с AI-анализом справедливой цены

**Компоненты:**

- `quote.service.ts` - Обработка предложений механика, сравнение с оценкой
- `quote.controller.ts` - Endpoints для управления предложениями

**Endpoints:**

```
POST /quote/:diagnosisId         - Добавить предложение механика
GET  /quote/:id                  - Получить результаты сравнения
GET  /diagnosis/:id/quotes       - Все предложения для диагностики
```

**Сравнение возвращает:**

```json
{
  "mechanicTotal": число,
  "verdict": "overcharge|fair|undercharge",
  "overchargeAmt": число,
  "overchargePct": число,
  "explanation": "объяснение разницы"
}
```

#### 5. **Chat Module** (`chat/`)

**Ответственность:** Сохранение истории чатов и сообщений

**Компоненты:**

- `chat.service.ts` - CRUD для чат сессий и сообщений
- `chat.controller.ts` - Endpoints

**Endpoints:**

```
POST /chat/session               - Создать новую сессию чата
GET  /chat/sessions              - Список всех сессий пользователя
POST /chat/:sessionId/message    - Добавить сообщение
GET  /chat/:sessionId/messages   - Получить все сообщения в сессии
DELETE /chat/:sessionId          - Удалить сессию чата
```

#### 6. **Prices Module** (`prices/`)

**Ответственность:** Работа с ценами на запчасти от разных магазинов (Mock данные)

**Компоненты:**

- `prices.service.ts` - Получение цен из базы данных
- `prices.controller.ts` - Endpoints

**Endpoints:**

```
GET  /prices                     - Получить все цены (mock)
GET  /prices/search?part=...     - Поиск по названию запчасти
```

#### 7. **Cars Module** (`cars/`)

**Ответственность:** Управление списком автомобилей пользователя

**Компоненты:**

- `cars.service.ts` - CRUD для автомобилей
- `cars.controller.ts` - Endpoints

**Endpoints:**

```
POST /cars                       - Добавить новый автомобиль
GET  /cars                       - Список автомобилей пользователя
GET  /cars/:id                   - Информация об автомобиле
PUT  /cars/:id                   - Обновить данные автомобиля
DELETE /cars/:id                 - Удалить автомобиль
```

#### 8. **VIN Module** (`vin/`)

**Ответственность:** Декодирование VIN и извлечение информации об автомобиле

**Компоненты:**

- `vin.service.ts` - Парсинг и декодирование VIN
- `vin.controller.ts` - Endpoints

**Endpoints:**

```
POST /vin/decode                 - Декодировать VIN
```

#### 9. **Common Services** (`common/`)

**Ответственность:** Общие утилиты и сервисы

- **`ai.service.ts`**
  - Интеграция с Google Generative AI (Gemini 1.5 Flash)
  - Интеграция с OpenAI Whisper для транскрибации аудио
  - Fallback механизмы при отсутствии API ключей
  - Безопасный JSON парсинг

- **`file.util.ts`**
  - Валидация типов файлов
  - Работа с путями к файлам
  - Удаление файлов

- **`json.util.ts`**
  - Безопасный парсинг JSON
  - Обработка ошибок парсинга

- **`response.util.ts`**
  - Форматирование успешных ответов
  - Форматирование ошибок

- **`types.ts`**
  - TypeScript интерфейсы для AI результатов
  - Типы для диагностики, предложений, чата

### Database Schema (Prisma)

```prisma
User
  ├── id (UUID)
  ├── email (unique)
  ├── name
  ├── avatar (optional)
  ├── googleId (optional, unique)
  ├── password (optional, для email/password auth)
  ├── createdAt
  └── Relations: diagnoses[], cars[], chatSessions[]

Car
  ├── id (UUID)
  ├── userId (FK)
  ├── vin (optional)
  ├── make
  ├── model
  ├── year
  ├── bodyType (optional)
  ├── engineSize (optional)
  ├── createdAt
  └── Relations: diagnoses[]

Diagnosis
  ├── id (UUID)
  ├── userId (FK, optional)
  ├── carId (FK, optional)
  ├── fileType (photo|video|audio)
  ├── filePath
  ├── rawResult (JSON строка)
  ├── problem
  ├── description
  ├── severity (low|medium|high)
  ├── totalMin (float)
  ├── totalMax (float)
  ├── createdAt
  └── Relations: quotes[]

Quote
  ├── id (UUID)
  ├── diagnosisId (FK)
  ├── filePath (optional)
  ├── mechanicTotal
  ├── verdict (overcharge|fair|undercharge)
  ├── overchargeAmt
  ├── overchargePct
  ├── explanation
  ├── rawResult (JSON строка)
  └── createdAt

ChatSession
  ├── id (UUID)
  ├── userId (FK)
  ├── title
  ├── createdAt
  ├── updatedAt
  └── Relations: messages[]

ChatMessage
  ├── id (UUID)
  ├── sessionId (FK)
  ├── role (user|assistant)
  ├── content
  ├── filePath (optional)
  ├── fileName (optional)
  ├── fileType (optional)
  ├── mimeType (optional)
  └── createdAt
```

### Environment переменные Backend

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_mechanic

# API Keys
GEMINI_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRATION=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Server
PORT=3000
NODE_ENV=development
```

---

## 📱 Mobile приложение

### Структура навигации

```
RootNavigator
├── BottomTabNavigator (если авторизован)
│   ├── Home Stack
│   │   ├── HomeScreen (загрузка файлов)
│   │   └── DiagnosisScreen (результаты)
│   ├── Chat Stack
│   │   ├── ChatHistoryScreen
│   │   └── ChatScreen
│   ├── Diagnosis Stack (History)
│   │   └── HistoryScreen
│   ├── Profile Stack
│   │   ├── ProfileScreen
│   │   ├── VinScreen
│   │   └── OBDScreen
│   └── Prices Stack
│       └── PricesScreen
└── Auth Stack (если не авторизован)
    ├── LoginScreen
    └── RegisterScreen
```

### Экраны и функциональность

| Экран                 | Путь                  | Функциональность                            |
| --------------------- | --------------------- | ------------------------------------------- |
| **HomeScreen**        | `/`                   | Загрузка фото/видео/аудио, выбор автомобиля |
| **DiagnosisScreen**   | `/diagnosis/:id`      | Отображение результатов AI анализа          |
| **ChatScreen**        | `/chat/:sessionId`    | Интерфейс чата для обсуждения диагностики   |
| **ChatHistoryScreen** | `/chat/history`       | Список всех чат сессий                      |
| **HistoryScreen**     | `/history`            | История всех диагностик                     |
| **QuoteScreen**       | `/quote/:diagnosisId` | Загрузка предложения механика и сравнение   |
| **PricesScreen**      | `/prices`             | Просмотр цен на запчасти                    |
| **OBDScreen**         | `/obd`                | Данные с OBD портов (mock данные)           |
| **ProfileScreen**     | `/profile`            | Профиль пользователя                        |
| **VinScreen**         | `/vin`                | Ввод и декодирование VIN                    |
| **LoginScreen**       | `/login`              | Вход по email/password или Google           |
| **RegisterScreen**    | `/register`           | Регистрация нового пользователя             |

### Context (State Management)

#### AuthContext

```typescript
{
  user: User | null,
  token: string | null,
  isLoading: boolean,
  error: string | null,
  login: (email, password) => Promise<void>,
  register: (email, name, password) => Promise<void>,
  logout: () => void,
  loginWithGoogle: () => Promise<void>
}
```

#### OBDContext

```typescript
{
  obdData: {
    speed: number,
    rpm: number,
    fuelLevel: number,
    temperature: number,
    dtcs: string[]
  } | null,
  isConnected: boolean,
  connect: () => Promise<void>,
  disconnect: () => void
}
```

### Компоненты

- **GradientCard.tsx** - Карточка с линейным градиентом для отображения результатов
- **LoaderDots.tsx** - Анимированный загрузчик с пульсирующими точками
- **StatusBadge.tsx** - Badge для отображения статусов (low, medium, high severity)

### API Service

```typescript
// src/services/api.ts
const client = axios.create({
  baseURL: EXPO_PUBLIC_API_URL,
  timeout: 30000,
});

// Методы:
client.post("/auth/login", credentials);
client.post("/auth/register", userData);
client.post("/diagnosis/upload", formData);
client.get("/diagnosis/:id");
client.post("/quote/:diagnosisId", quoteData);
client.get("/prices");
// и др.
```

### Theme

Определено в `src/theme/index.ts`:

- Цветовая палитра (primary, secondary, success, error)
- Размеры шрифтов и отступов
- Радиусы скругления
- Тени и effects

### Environment переменные Mobile

```env
# .env файл в mobile/
EXPO_PUBLIC_API_URL=http://10.0.0.x:3000  # Замените на IP вашего ПК для реального девайса
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 💾 База данных

### PostgreSQL схема

**Установка:**

```bash
# Используя Prisma
npm run prisma:push

# Или используя SQL скрипт
psql -U postgres -d ai_mechanic -f prisma/init-postgres.sql
```

### Основные таблицы

1. **users** - Хранит данные пользователей и их credentials
2. **cars** - Автомобили пользователей (может быть несколько на пользователя)
3. **diagnoses** - Результаты диагностик (фото/видео/аудио анализ)
4. **quotes** - Предложения механиков и их анализ
5. **chat_sessions** - Сессии чатов
6. **chat_messages** - Сообщения в чатах

### Отношения между таблицами

```
User (1) ──→ (∞) Diagnosis
User (1) ──→ (∞) Car
User (1) ──→ (∞) ChatSession

Car (1) ──→ (∞) Diagnosis

Diagnosis (1) ──→ (∞) Quote
ChatSession (1) ──→ (∞) ChatMessage
```

---

## 🔌 API Endpoints

### Authentication

```http
POST /auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
Response: 200 OK
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": { id, email, name, avatar, createdAt }
}

POST /auth/login
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
Response: 200 OK (same as register)

POST /auth/refresh
Authorization: Bearer <refresh_token>
Response: 200 OK
{
  "access_token": "new_jwt_token"
}

GET /auth/google
Response: Redirect to Google OAuth consent screen

GET /auth/google/callback?code=auth_code
Response: Redirect to mobile app with token
```

### Diagnosis

```http
POST /diagnosis/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
{
  "file": <binary>,
  "carId": "car-uuid" (optional)
}
Response: 201 Created
{
  "id": "diagnosis-uuid",
  "problem": "Engine knocking",
  "description": "...",
  "severity": "high",
  "parts_needed": [...],
  "totalMin": 500,
  "totalMax": 1000,
  "confidence": 0.92,
  "createdAt": "2026-04-17T10:00:00Z"
}

GET /diagnosis/:id
Authorization: Bearer <access_token>
Response: 200 OK
{
  "id": "diagnosis-uuid",
  "problem": "...",
  ...
}

GET /diagnosis/user/all
Authorization: Bearer <access_token>
Response: 200 OK
[
  { diagnosis 1 },
  { diagnosis 2 },
  ...
]

DELETE /diagnosis/:id
Authorization: Bearer <access_token>
Response: 204 No Content
```

### Quote Comparison

```http
POST /quote/:diagnosisId
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "mechanicQuoteImage": <file_or_text>,
  "mechanicTotal": 1500
}
Response: 201 Created
{
  "id": "quote-uuid",
  "mechanicTotal": 1500,
  "verdict": "overcharge",
  "overchargeAmt": 500,
  "overchargePct": 33.33,
  "explanation": "Механик запрашивает...",
  "createdAt": "2026-04-17T10:00:00Z"
}

GET /quote/:id
Authorization: Bearer <access_token>
Response: 200 OK (same as POST response)

GET /diagnosis/:diagnosisId/quotes
Authorization: Bearer <access_token>
Response: 200 OK
[ { quote 1 }, { quote 2 }, ... ]
```

### Chat

```http
POST /chat/session
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "title": "Discussing engine noise"
}
Response: 201 Created
{
  "id": "session-uuid",
  "title": "...",
  "createdAt": "2026-04-17T10:00:00Z"
}

GET /chat/sessions
Authorization: Bearer <access_token>
Response: 200 OK
[ { session 1 }, { session 2 }, ... ]

POST /chat/:sessionId/message
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "role": "user",
  "content": "Что это означает?",
  "filePath": "optional-path" (optional)
}
Response: 201 Created
{
  "id": "message-uuid",
  "role": "user",
  "content": "...",
  "createdAt": "2026-04-17T10:00:00Z"
}

GET /chat/:sessionId/messages
Authorization: Bearer <access_token>
Response: 200 OK
[ { message 1 }, { message 2 }, ... ]

DELETE /chat/:sessionId
Authorization: Bearer <access_token>
Response: 204 No Content
```

### Cars

```http
POST /cars
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "make": "BMW",
  "model": "X5",
  "year": 2020,
  "vin": "WBY2Z2C55EV123456",
  "bodyType": "SUV",
  "engineSize": "3.0L"
}
Response: 201 Created
{ id, make, model, year, vin, bodyType, engineSize, createdAt }

GET /cars
Authorization: Bearer <access_token>
Response: 200 OK
[ { car 1 }, { car 2 }, ... ]

GET /cars/:id
Authorization: Bearer <access_token>
Response: 200 OK
{ full car object }

PUT /cars/:id
Authorization: Bearer <access_token>
Content-Type: application/json
{ updated fields }
Response: 200 OK

DELETE /cars/:id
Authorization: Bearer <access_token>
Response: 204 No Content
```

### VIN Decoding

```http
POST /vin/decode
Authorization: Bearer <access_token>
Content-Type: application/json
{
  "vin": "WBY2Z2C55EV123456"
}
Response: 200 OK
{
  "make": "BMW",
  "model": "X5",
  "year": 2020,
  "bodyType": "SUV",
  "engineSize": "3.0L"
}
```

### Prices

```http
GET /prices
Response: 200 OK
[ { name, min_price, max_price, store }, ... ]

GET /prices/search?part=brake+pad
Response: 200 OK
[ matching parts with prices ]
```

---

## ✨ Основные функции

### 1. **Диагностика через AI**

- Пользователь загружает фото, видео или аудиозапись проблемы
- Backend отправляет файл на анализ Gemini 1.5 Flash
- Получает результат в структурированном JSON формате
- Возвращает мобильному приложению результат с проблемой, описанием, серьёзностью и сметой на ремонт

### 2. **Сравнение предложений механика**

- После получения диагностики пользователь может загрузить фото или текст предложения механика
- Backend анализирует предложение с помощью AI
- Сравнивает цену механика с AI-сметой
- Выявляет переплату (если есть) и объясняет разницу

### 3. **История диагностик**

- Все диагностики сохраняются в БД с привязкой к пользователю
- Пользователь может просмотреть историю всех диагностик
- Может вернуться к любой диагностике и добавить предложение механика

### 4. **Чат помощник**

- Пользователь может создавать чат сессии для обсуждения диагностики
- История чатов сохраняется в БД
- Можно поделиться файлами в чате

### 5. **Управление автомобилями**

- Сохранение нескольких автомобилей в профиле
- Привязка диагностик к конкретному автомобилю
- Декодирование VIN для автоматического заполнения информации об авто

### 6. **OBD интеграция**

- Mock данные для демонстрации
- В будущем: реальная интеграция с OBD портами через Bluetooth
- Помогает повысить точность диагностики

### 7. **Цены на запчасти**

- Просмотр цен от трёх разных магазинов (mock данные)
- Поиск по названию запчасти
- Сравнение цен

---

## 🚀 Установка и запуск

### Предварительные требования

- **Node.js** (v18+)
- **npm** или **yarn**
- **PostgreSQL** (установленный и запущенный)
- **Docker** (опционально, для контейнеризации)

### Backend установка и запуск

```bash
# Перейти в папку backend
cd backend

# Установить зависимости
npm install

# Создать .env файл с переменными (смотрите выше)
cp .env.example .env
# Отредактируйте .env с вашими API ключами и DB URL

# Генерировать Prisma Client
npm run prisma:generate

# Применить миграции БД
npm run prisma:push

# Сборка TypeScript
npm run build

# Запуск разработческого сервера
npm run start:dev

# Backend будет доступен на http://localhost:3000
```

### Mobile установка и запуск

```bash
# Перейти в папку mobile
cd mobile

# Установить зависимости
npm install

# Создать .env файл
# EXPO_PUBLIC_API_URL=http://<YOUR_PC_LAN_IP>:3000

# Запустить Expo dev сервер
npm start

# Выбрать платформу:
# - Нажать 'a' для Android
# - Нажать 'i' для iOS
# - Нажать 'w' для Web
# - Нажать 'j' для дебага в браузере
```

### Запуск с Docker (опционально)

```bash
# Из корневой папки проекта
docker-compose up -d

# Это запустит:
# - PostgreSQL на порту 5432
# - Backend на порту 3000
```

---

## 🧪 Тестирование

### Backend тесты

```bash
cd backend

# Unit тесты
npm run test

# Смотреть режим (re-run на изменение файлов)
npm run test:watch

# E2E тесты (включают все 10 основных сценариев)
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

### E2E сценарии

E2E тесты покрывают:

1. Регистрация и вход пользователя
2. Загрузка и анализ фото/видео/аудио
3. Сохранение диагностики в БД
4. Добавление предложения механика
5. Сравнение цен
6. Создание и сохранение чата
7. Управление автомобилями
8. VIN декодирование
9. Получение цен на запчасти
10. Удаление данных

```bash
# Запустить E2E тесты
npm run test:e2e

# С подробным выводом
npm run test:e2e -- --verbose
```

---

## 📦 Развертывание

### Развертывание Backend

#### Вариант 1: Традиционный сервер

```bash
# Build для production
npm run build

# Установить PM2 для управления процессом
npm install -g pm2

# Запустить приложение с PM2
pm2 start dist/main.js --name "ai-mechanic-backend"

# Сохранить конфигурацию PM2
pm2 save
```

#### Вариант 2: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

```bash
# Build образа
docker build -t ai-mechanic-backend:latest .

# Запустить контейнер
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e GEMINI_API_KEY="..." \
  ai-mechanic-backend:latest
```

#### Вариант 3: Cloud (AWS, Heroku, DigitalOcean и т.д.)

Смотрите [docs/DEPLOY.md](docs/DEPLOY.md) для подробных инструкций

### Развертывание Mobile приложения

#### Вариант 1: Expo Go (тестирование)

```bash
# Просто запустить npm start и отсканировать QR код на телефоне
npm start
```

#### Вариант 2: EAS Build (рекомендуется)

```bash
# Установить EAS CLI
npm install -g eas-cli

# Логин в Expo
eas login

# Создать iOS IPA
eas build --platform ios

# Создать Android APK/AAB
eas build --platform android

# Отправить на App Store / Google Play
eas submit --platform ios
eas submit --platform android
```

#### Вариант 3: Manual Build

```bash
# Android APK
npx expo prebuild --clean
cd android && ./gradlew assembleRelease

# iOS IPA
npx expo prebuild --clean
cd ios && xcodebuild -workspace 'Workspace.xcworkspace' -scheme YourApp -configuration Release -archivePath Release.xcarchive -archive
```

### Production Environment переменные

**Backend (.env):**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@prod-db-host:5432/ai_mechanic
GEMINI_API_KEY=your_production_key
OPENAI_API_KEY=your_production_key
JWT_SECRET=very_long_random_secret_string_min_32_chars
JWT_EXPIRATION=24h
REFRESH_TOKEN_SECRET=another_long_secret_string
REFRESH_TOKEN_EXPIRATION=7d
GOOGLE_CLIENT_ID=production_client_id
GOOGLE_CLIENT_SECRET=production_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

**Mobile (app.json):**

```json
{
  "expo": {
    "name": "AI Mechanic",
    "extra": {
      "apiUrl": "https://api.yourdomain.com"
    }
  }
}
```

---

## 🔒 Security особенности

1. **JWT Authentication** - Все endpoints (кроме auth) требуют валидный JWT токен
2. **Google OAuth 2.0** - Безопасная аутентификация через Google
3. **Password Hashing** - Bcrypt для хеширования паролей
4. **CORS** - Настроена для mobile app и frontend
5. **File Upload Validation** - Проверка типов и размеров файлов
6. **Environment переменные** - Все sensitive данные хранятся в .env
7. **Database Encryption** - Рекомендуется использовать SSL/TLS для подключения к БД

---

## 🐛 Troubleshooting

### Проблема: "Cannot find module '@nestjs/core'"

```bash
# Решение:
cd backend
npm install
npm run prisma:generate
```

### Проблема: "DATABASE_URL not set"

```bash
# Убедитесь что .env файл создан и содержит:
DATABASE_URL=postgresql://user:password@localhost:5432/ai_mechanic
```

### Проблема: "Connection refused to localhost:3000"

```bash
# Убедитесь что Backend запущен:
cd backend
npm run start:dev

# Backend должен выводить:
# [NestFactory] Nest application successfully started on http://0.0.0.0:3000
```

### Проблема: Mobile app не может подключиться к Backend

```bash
# Для реального устройства замените localhost на LAN IP:
# Найдите IP вашего ПК:
# Windows: ipconfig
# Mac/Linux: ifconfig

# В mobile/.env установите:
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

---

## 📚 Дополнительные ресурсы

- [NestJS документация](https://docs.nestjs.com/)
- [React Native документация](https://reactnative.dev/)
- [Expo документация](https://docs.expo.dev/)
- [Prisma ORM](https://www.prisma.io/docs/)
- [Google Generative AI API](https://ai.google.dev/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)

---

## 📝 Contributing

Если вы хотите внести вклад в проект:

1. Fork репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit ваших изменений (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

---

## 📄 Лицензия

Проект лицензирован под MIT License - смотрите файл [LICENSE](LICENSE) для деталей.

---

**Версия документации:** 1.0  
**Последнее обновление:** 17 апреля 2026 г.  
**Статус проекта:** MVP в активной разработке
