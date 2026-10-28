# Alina — API Server

Node.js + TypeScript backend for Alina AI. Built with Fastify, Prisma Composer, PostgreSQL, Redis, BullMQ, and WebSocket.

---

## Stack

| Technology | Purpose |
|------------|---------|
| Fastify 5 | HTTP server and route handling |
| TypeScript 6 | Application language |
| Prisma ORM v8 + Composer | Database schema and migrations |
| PostgreSQL | Primary data store |
| Redis | Caching and job queues |
| BullMQ | Background AI processing jobs |
| Socket.IO | Real-time WebSocket updates |
| Google Gemma 4 | AI agent with function calling |
| YouCam AI | Facial skin analysis and simulations |
| Qloo | Taste intelligence for recommendations |
| Argon2 | Password hashing |
| Resend | Transactional email |

---

## Prerequisites

- Node.js `^22.18.0` or `^24.11.0`
- PostgreSQL running locally
- Redis running locally

---

## Setup

### 1. Install dependencies

From the `apps/server` directory:

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
NODE_ENV=development

HOST=0.0.0.0
PORT=3155

HOST_URL=http://localhost:3155
CLIENT_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://postgres:root@localhost:5432/alina?schema=public

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT — use long random strings
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Email
RESEND_API_KEY=re_xxxxxxxxx

# YouCam
YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
YOUCAM_API_KEY=your_youcam_api_key

# Qloo
QLOO_API_URL=https://hackathon.api.qloo.com
QLOO_API_KEY=your_qloo_api_key

# Google AI (Gemma 4)
GOOGLE_API_KEY=your_google_api_key

# OAuth (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3155/auth/google/callback
```

### 3. Set up the database

**First time only:**

```bash
npx prisma contract emit   # generate the typed contract from the schema
npx prisma db init         # create the database and apply the baseline schema
```

**After any schema change:**

```bash
npx prisma migration new   # author a new migration file
npx prisma db migrate      # apply pending migrations
```

**Optional — seed demo data:**

```bash
npm run db:seed
```

### 4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3155`.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with tsx watch (requires `DATABASE_URL`) |
| `npm run build` | Compile to `dist/` with tsdown |
| `npm run start` | Run the compiled build |
| `npm run contract:emit` | Regenerate the typed Prisma contract |
| `npx prisma db init` | Initialise the database (first time) |
| `npx prisma migration new` | Create a new migration |
| `npx prisma db migrate` | Apply pending migrations |
| `npm run db:seed` | Seed demo data |
| `npm run test:ai` | Run the AI integration test |

---

## Project structure

```text
src/
├── app.ts                  # Fastify application factory
├── index.ts                # Entry point
├── config/                 # Environment config and logger
├── modules/
│   ├── auth/               # Registration, login, OAuth, email verification
│   ├── scan/               # Scan upload and result routes
│   ├── recommendations/    # Recommendation routes
│   ├── routines/           # Routine and step routes
│   ├── messages/           # Chat message routes
│   ├── preferences/        # User preference routes
│   ├── products/           # Product catalog routes
│   ├── orders/             # Order routes
│   └── subscriptions/      # Subscription routes
├── services/
│   ├── ai/
│   │   ├── gemma/          # Gemma 4 agent, instructions, tools registry
│   │   └── tools/          # Function-calling tools (skincare, YouCam, Qloo)
│   ├── yomCam.service.ts   # YouCam API client
│   ├── redis.service.ts    # Redis client and cache helpers
│   └── websocket.service.ts
├── prisma/
│   ├── contract.prisma     # Schema definition
│   ├── contract.d.ts       # Generated TypeScript types
│   ├── db.ts               # Database client and ORM accessors
│   └── seed/               # Demo seed data
├── queues/                 # BullMQ job producers and workers
├── plugins/                # Fastify plugins (auth, prisma, redis)
├── routes/                 # Route registration
└── errors/                 # APIError and error handling
```

---

## Prisma Composer

The schema lives in `src/prisma/contract.prisma`. After any change:

```bash
npx prisma contract emit
```

The generated `contract.d.ts` and `contract.json` are committed so the typed ORM is available without a build step.

Config: `prisma.config.ts`  
Composer app: `module.ts`, `service.ts`

---

## Health check

```
GET /health
→ { "status": "ok", "service": "alina-api" }
```
