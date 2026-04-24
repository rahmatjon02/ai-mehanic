# AI Mechanic — Backend API

> Умный AI-механик для водителей Таджикистана. Диагностика автомобилей по фото, видео и аудио, проверка смет, сравнение цен на запчасти — всё в одном REST API.

---

## Описание проекта

**AI Mechanic** — это мобильное приложение и REST API, которое помогает водителям в Таджикистане самостоятельно диагностировать проблемы автомобиля и не переплачивать за ремонт.

### Проблема

В Таджикистане большинство водителей:
- Не могут отличить честную смету механика от завышенной
- Не знают реальных цен на запчасти в Душанбе
- Не понимают, что означают симптомы автомобиля — стук, дым, запах
- Не имеют доступа к OBD-сканеру или дорогостоящей диагностике

### Решение

Пользователь снимает видео звука двигателя, фотографирует проблему или описывает симптомы — AI Mechanic анализирует и говорит: что сломалось, как серьёзно, сколько стоит починить, какие запчасти нужны и честна ли смета механика.

### Целевая аудитория

Водители в Таджикистане (Душанбе и регионы) с доступом к смартфону. Все ответы, цены и рекомендации адаптированы под местный рынок — в сомони (TJS), с учётом реальных цен душанбинских магазинов.

---

## Технический стек

| Компонент | Технология |
|-----------|-----------|
| Фреймворк | NestJS 11 + TypeScript 5.7 |
| База данных | PostgreSQL + Prisma ORM |
| Основной AI | Google Gemini 2.5 Flash (фото / видео / аудио) |
| Запасной AI | Groq Llama-4-Scout (текст, чат, fallback) |
| Quote AI | OpenAI GPT-4o (проверка смет, fallback) |
| Аутентификация | JWT (30 дней) + Google OAuth 2.0 |
| Документация API | Swagger / OpenAPI |
| Безопасность | Helmet, Throttler (rate limiting) |
| Загрузка файлов | Multer (до 50 МБ) |
| VIN-декодирование | NHTSA API + оффлайн WMI таблицы |
| Деплой | Ubuntu VPS, Nginx, PM2, GitHub Actions CI/CD |

---

## Возможности API

### Диагностика по медиафайлам
Пользователь загружает **фото, видео или аудио** — Gemini 2.5 Flash анализирует файл целиком и возвращает структурированный результат: проблема, описание, степень серьёзности, нужные запчасти, диапазон стоимости ремонта. При недоступности Gemini — автоматический fallback на Groq.

### Проверка сметы механика
Пользователь загружает фото/скан сметы от механика или вводит текст. AI сравнивает сумму со своей оценкой стоимости ремонта и выносит вердикт: честная / завышена / занижена — с объяснением и суммой переплаты.

### Сравнение цен на запчасти
По результату диагностики система находит нужные запчасти в базе данных цен душанбинских магазинов и показывает цены и наличие в разных точках города.

### OBD-сканер (эмуляция)
Эмуляция OBD-II диагностики с реалистичными кодами ошибок (P0300, P0420, P0171 и др.), описанием проблемы и степенью серьёзности.

### AI чат с механиком
Полноценный чат-ассистент на русском языке с историей диалога. Поддерживает вложения — фото, аудио, видео прямо в чате.

### История диагностик
Все диагностики сохраняются в базе данных и доступны пользователю в любой момент с полным результатом.

### VIN-декодирование
По 17-символьному VIN-коду определяет марку, модель, год, тип кузова и объём двигателя. Использует NHTSA API с оффлайн-fallback.

### Управление автомобилями
Пользователь может сохранить несколько автомобилей в профиле и привязывать диагностики к конкретному автомобилю.

### Авторизация
Регистрация/вход по email + паролю или через Google OAuth. Все защищённые эндпоинты требуют JWT Bearer токен.

---

## Как работает AI-диагностика

```
Пользователь загружает файл (фото / видео / аудио)
         │
         ▼
  Валидация файла (тип, размер ≤ 50 МБ)
         │
         ▼
  Сохранение файла в uploads/
         │
         ▼
┌─────────────────────────────────────────┐
│         AiService.analyzeDiagnosis()    │
│                                         │
│  1. Gemini 2.5 Flash                    │
│     - Анализирует файл целиком          │
│     - Фото → inline base64              │
│     - Видео → inline base64             │
│     - Аудио → inline base64             │
│                                         │
│  2. Fallback: Groq Llama-4-Scout        │
│     - Аудио: Whisper транскрипция       │
│     - Видео/изображение: текстовый      │
│       промпт без файла                  │
└─────────────────────────────────────────┘
         │
         ▼
  Нормализация JSON-ответа:
  severity → low|medium|high
  числа → Float
         │
         ▼
  Сохранение в базу данных (Diagnosis)
         │
         ▼
  Ответ клиенту:
  {
    diagnosisId, problem, description,
    severity, parts_needed[], 
    total_cost_min, total_cost_max,
    confidence
  }
```

**Промпт диагностики** настроен на:
- Русский язык ответа
- Цены в TJS (таджикские сомони)
- Реалии душанбинского рынка запчастей
- Диапазон стоимости работ 80–200 TJS/час

---

## Все API эндпоинты

### Аутентификация (`/auth`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/auth/register` | Регистрация по email/паролю | Нет |
| POST | `/auth/login` | Вход по email/паролю | Нет |
| POST | `/auth/google` | Вход через Google (мобильный токен) | Нет |
| GET | `/auth/google/web` | Google OAuth редирект (веб) | Нет |
| GET | `/auth/google/callback` | Callback после Google OAuth | Нет |
| GET | `/auth/profile` | Получить профиль текущего пользователя | JWT |
| PATCH | `/auth/profile` | Обновить имя или аватар | JWT |

### Автомобили (`/cars`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/cars` | Добавить автомобиль в профиль | JWT |
| GET | `/cars` | Список всех автомобилей пользователя | JWT |
| DELETE | `/cars/:id` | Удалить автомобиль | JWT |

### Диагностика (`/diagnosis`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/diagnosis/analyze?type=image\|audio\|video` | Анализ файла — AI-диагностика | JWT |
| GET | `/diagnosis` | История диагностик пользователя | JWT |
| GET | `/diagnosis/:id` | Детали одной диагностики со сметами | JWT |

### Смета механика (`/quote`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/quote/check/:diagnosisId` | Проверить смету по фото или тексту | JWT |

### Цены на запчасти (`/prices`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| GET | `/prices/:diagnosisId` | Цены на запчасти в душанбинских магазинах | JWT |

### VIN-декодирование (`/vin`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/vin/decode` | Декодировать VIN-номер (17 символов) | Нет |

### OBD-сканер (`/obd`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| GET | `/obd/scan` | Эмуляция OBD-II сканирования | JWT |

### AI чат (`/chat`)

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/chat/sessions` | Создать новую сессию чата | JWT |
| GET | `/chat/sessions` | Список всех сессий пользователя | JWT |
| GET | `/chat/sessions/:id` | Сессия с полной историей сообщений | JWT |
| POST | `/chat/sessions/:id/messages` | Отправить сообщение (+ опциональный файл) | JWT |
| DELETE | `/chat/sessions/:id` | Удалить сессию чата | JWT |

### Системные

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| GET | `/` | Статус сервера | Нет |
| GET | `/health/diagnostics` | Проверка всех внешних сервисов | Нет |

---

## Стандартный формат ответа

Все эндпоинты возвращают единый формат:

```json
// Успех
{
  "success": true,
  "data": { }
}

// Ошибка
{
  "success": false,
  "error": "описание ошибки",
  "data": null
}
```

---

## Схема базы данных

```
User
├── id (UUID)
├── email (unique)
├── name
├── avatar?
├── googleId? (unique)
├── password? (bcrypt hash)
├── createdAt
├── cars[]        → Car
├── diagnoses[]   → Diagnosis
└── chatSessions[]→ ChatSession

Car
├── id (UUID)
├── userId → User
├── vin?, make, model, year
├── bodyType?, engineSize?
├── createdAt
└── diagnoses[] → Diagnosis

Diagnosis
├── id (UUID)
├── userId? → User
├── carId?  → Car
├── fileType, filePath
├── rawResult (JSON string)
├── problem, description
├── severity (low|medium|high)
├── totalMin, totalMax (Float, TJS)
├── createdAt
└── quotes[] → Quote

Quote
├── id (UUID)
├── diagnosisId → Diagnosis (cascade delete)
├── filePath?
├── mechanicTotal (Float)
├── verdict (fair|overpriced|underpriced)
├── overchargeAmt, overchargePct (Float)
├── explanation
├── rawResult (JSON string)
└── createdAt

ChatSession
├── id (UUID)
├── userId → User (cascade delete)
├── title
├── createdAt, updatedAt
└── messages[] → ChatMessage

ChatMessage
├── id (UUID)
├── sessionId → ChatSession (cascade delete)
├── role (user|assistant)
├── content
├── fileName?, filePath?, fileType?, mimeType?
└── createdAt
```

---

## Архитектура проекта

```
backend/
├── src/
│   ├── main.ts               # Bootstrap, Swagger, Helmet, CORS
│   ├── app.module.ts         # Корневой модуль, Throttler, ServeStatic
│   │
│   ├── common/
│   │   ├── ai.service.ts     # Оркестрация Gemini / Groq / OpenAI
│   │   ├── file.util.ts      # UUID-имена файлов, определение типа
│   │   ├── json.util.ts      # Безопасный парсинг JSON из ответов AI
│   │   ├── response.util.ts  # Стандартный формат { success, data }
│   │   ├── types.ts          # DiagnosisResult, QuoteComparisonResult и др.
│   │   └── http-exception.filter.ts
│   │
│   ├── prisma/               # Обёртка над Prisma Client
│   │
│   ├── auth/                 # JWT, Google OAuth, guards, decorators
│   ├── users/                # CRUD пользователей
│   ├── cars/                 # Управление автомобилями
│   ├── diagnosis/            # AI-диагностика (Gemini → Groq)
│   ├── quote/                # Проверка смет (OpenAI → Gemini → Groq)
│   ├── prices/               # Цены душанбинских магазинов
│   ├── chat/                 # AI чат-сессии
│   ├── vin/                  # VIN-декодер (NHTSA API)
│   ├── obd/                  # OBD-II эмулятор
│   └── health/               # Health-check всех сервисов
│
├── prisma/
│   └── schema.prisma         # 6 моделей: User, Car, Diagnosis, Quote, ChatSession, ChatMessage
│
├── uploads/                  # Загруженные файлы (серв через /uploads)
└── .env                      # Секреты и конфигурация
```

### Связи между модулями

```
AppModule
    ├── AuthModule       ←→ UsersModule (поиск/создание пользователей)
    ├── CarsModule       ← PrismaModule
    ├── DiagnosisModule  ← AiService (common) + PrismaModule
    ├── QuoteModule      ← AiService (common) + DiagnosisModule + PrismaModule
    ├── PricesModule     ← DiagnosisModule + tajikistan-prices.json
    ├── ChatModule       ← AiService (common) + PrismaModule
    ├── VinModule        ← NHTSA API (http)
    ├── ObdModule        (standalone, random scenarios)
    └── HealthModule     ← проверяет все внешние сервисы
```

---

## Запуск локально

### 1. Клонировать репозиторий и перейти в бэкенд

```bash
git clone <repo-url>
cd backend
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Создать файл `.env`

```env
# База данных
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ai_mechanic?schema=public

# Порт сервера
PORT=3006

# AI-сервисы
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3006/auth/google/callback
```

### 4. Создать базу данных и применить миграции

```bash
# Синхронизировать схему с базой данных
npx prisma db push

# Сгенерировать Prisma Client
npx prisma generate
```

### 5. Запустить сервер

```bash
# Режим разработки (с hot reload)
npm run start:dev

# Продакшн
npm run build && npm run start:prod
```

### 6. Проверить работу

- Сервер: [http://localhost:3006](http://localhost:3006)
- Swagger UI: [http://localhost:3006/api-docs](http://localhost:3006/api-docs)

---

## Деплой на сервер

### Сервер

| Параметр | Значение |
|----------|---------|
| IP | 204.168.160.3 |
| Prod URL | http://204.168.160.3/ai-mechanic |
| Swagger | http://204.168.160.3/ai-mechanic/api-docs |
| Порт приложения | 3006 |
| Процесс-менеджер | PM2 |
| Веб-сервер | Nginx (reverse proxy) |
| CI/CD | GitHub Actions |

### Nginx конфигурация (схема)

```nginx
location /ai-mechanic {
    proxy_pass http://localhost:3006;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### PM2 запуск

```bash
npm run build
pm2 start dist/main.js --name ai-mechanic
pm2 save
```

### GitHub Actions CI/CD

При каждом пуше в `master` — автоматически:
1. SSH на сервер
2. `git pull`
3. `npm install`
4. `npm run build`
5. `npx prisma generate`
6. `pm2 restart ai-mechanic`

---

## Переменные окружения (продакшн)

```env
DATABASE_URL=postgresql://...@localhost:5432/ai_mechanic?schema=public
PORT=3006
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GROQ_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...  # минимум 32 символа
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://204.168.160.3/ai-mechanic/auth/google/callback
```

---

## Реализовано за хакатон

### Инфраструктура и архитектура
- [x] NestJS приложение с модульной архитектурой (9 модулей)
- [x] PostgreSQL + Prisma ORM (6 моделей, связи, каскадное удаление)
- [x] Swagger / OpenAPI документация с Bearer авторизацией
- [x] Стандартизированный формат ответов `{ success, data, error }`
- [x] Глобальный фильтр исключений
- [x] Rate limiting (Throttler, 10 req/60s)
- [x] Helmet security headers
- [x] CORS настройка
- [x] Раздача загруженных файлов через `/uploads`
- [x] Деплой на VPS (Nginx + PM2 + GitHub Actions CI/CD)

### Авторизация
- [x] Регистрация и вход по email/паролю (bcrypt)
- [x] JWT токены (30 дней)
- [x] Google OAuth 2.0 — веб-поток (редирект) и мобильный (access token)
- [x] Защита роутов (JwtAuthGuard, OptionalJwtGuard)
- [x] Управление профилем (просмотр, обновление имени/аватара)

### AI-диагностика
- [x] Загрузка фото / видео / аудио (до 50 МБ)
- [x] Gemini 2.5 Flash — анализ файла целиком (все форматы)
- [x] Groq Llama-4-Scout — fallback при недоступности Gemini
- [x] Groq Whisper v3 — транскрипция аудио как fallback
- [x] Структурированный результат: проблема, описание, severity, запчасти, стоимость
- [x] Цены в TJS, адаптировано под Душанбе
- [x] История диагностик с сохранением в БД

### Проверка смет
- [x] Загрузка фото/скана сметы или текстовый ввод
- [x] OpenAI GPT-4o → Gemini → Groq fallback
- [x] Вердикт: fair / overpriced / underpriced
- [x] Сумма переплаты, процент переплаты, объяснение, подозрительные позиции
- [x] Сохранение результата в БД, привязка к диагностике

### Цены на запчасти
- [x] База данных цен душанбинских магазинов (JSON)
- [x] Нечёткий поиск запчастей по имени (partial word overlap)
- [x] Цены от 3 магазинов с наличием на складе

### AI чат
- [x] Создание / удаление сессий чата
- [x] История сообщений с контекстом диалога
- [x] Отправка файлов (фото, аудио, видео) прямо в чат
- [x] Groq → Gemini fallback
- [x] Автогенерация заголовка сессии
- [x] Русскоязычный автомеханик-ассистент

### VIN и OBD
- [x] Декодирование VIN через NHTSA API
- [x] Оффлайн-fallback по WMI таблицам (без интернета)
- [x] Валидация VIN (17 символов, корректные символы)
- [x] OBD-II эмулятор с 7 реалистичными сценариями ошибок

### Управление автомобилями
- [x] Добавление / просмотр / удаление автомобилей
- [x] Привязка диагностик к автомобилю
- [x] VIN, марка, модель, год, тип кузова, объём двигателя

### Мониторинг
- [x] Health-check endpoint (`/health/diagnostics`)
- [x] Проверка всех внешних сервисов: PostgreSQL, Gemini, Groq, OpenAI, NHTSA
- [x] Параллельные проверки, общий статус `allSystemsGo`

---

## Статистика

| Показатель | Значение |
|-----------|---------|
| Контроллеры | 9 |
| Сервисы | 11 |
| Модели БД | 6 |
| API эндпоинтов | 28+ |
| Защищённых эндпоинтов | 20+ |
| AI-провайдеров | 3 (Gemini, Groq, OpenAI) |
| Внешних интеграций | 4 (Gemini, Groq, OpenAI, NHTSA) |

---

## Команда

Разработано в рамках хакатона. Backend на NestJS + TypeScript с AI-интеграцией для водителей Таджикистана.
