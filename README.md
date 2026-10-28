<div align="center">

# ✨ Alina AI

### Intelligent AI-powered skincare assistant built with **Gemma 4** + **YouCam AI** + **Qloo**

Analyze • Understand • Track • Improve

---

[![Gemma 4](https://img.shields.io/badge/Gemma-4-blue?style=for-the-badge)](#)
[![YouCam AI](https://img.shields.io/badge/YouCam-AI-purple?style=for-the-badge)](#)
[![Qloo](https://img.shields.io/badge/Qloo-Taste_AI-orange?style=for-the-badge)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black?style=for-the-badge&logo=fastify)](#)
[![Prisma](https://img.shields.io/badge/Prisma-v8-2D3748?style=for-the-badge&logo=prisma)](#)

</div>

---

# 📖 Overview

Alina AI is an intelligent skincare assistant that combines **computer vision** with **large language models** to help users understand their skin over time.

Instead of simply showing skin scores, Alina analyzes every scan, compares it with historical data, remembers previous recommendations, and generates personalized skincare guidance.

The AI is powered by three major components:

- **YouCam AI** → Performs facial skin analysis and, on request, face analysis and image simulations (aging, skin improvement, face reshape).
- **Gemma 4** → Understands, reasons, compares history, and creates personalized observations and recommendations.
- **Qloo** → Taste intelligence that tailors brands, products, places, influencers and podcasts to each user's preferences.

---

# 🎥 Demo


[![Watch Demo](./images/homepage.jpg)](https://youtu.be/aROGceADVLk?si=_bMlfkXYolDmsCKI)

---

## 📸 Screenshots

| Dashboard | Scan |
|-----------|------|
| ![](./images/dashboard.jpg) | ![](./images/scan.jpg) |

| Progress | AI Chat |
|-------------|---------|
| ![](./images/progress.jpg) | ![](./images/chat.jpg) |

---

# 🧠 AI Architecture

```text
                User
                  │
                  ▼
          Upload Face Image
                  │
                  ▼
             YouCam AI
                  │
      Facial Skin Analysis
                  │
                  ▼
        Store Scan + Metrics
                  │
                  ▼
          Gemma 4 AI Agent  ◄── YouCam tools on request
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
 Retrieve     Compare      Reason
 History      Progress     About Skin
      │
      ▼
 Generate Insights
      │
      ▼
 Personalized Recommendations
      │
      ▼
      User
```

---

# 🔍 YouCam AI

YouCam AI performs the computer vision analysis.

For every uploaded image it detects and measures:

- Skin Score
- Skin Age
- Skin Tone
- Fitzpatrick Skin Type
- Moisture
- Oiliness
- Radiance
- Redness
- Acne
- Texture
- Wrinkles
- Pores
- Firmness
- Dark Circles
- Eye Bags
- Droopy Eyelids
- Tear Troughs
- Age Spots

These measurements become the source of truth for every recommendation made by Alina.

Beyond the scan, Alina can also call YouCam on demand from the chat. See [YouCam tools](#-youcam-tools) below.

---

# 🧬 YouCam tools

YouCam is exposed to Gemma as eight **function-calling tools**, so the agent can run a fresh analysis or generate a simulation when the user asks for one, on any photo they choose.

## Analysis

| Tool | What it does |
|------|--------------|
| `youcam_analyze_skin` | Fresh HD skin analysis: overall score, skin age and per-concern scores (acne, pores, wrinkles, redness, moisture and more). Can be limited to a subset of concerns. |
| `youcam_analyze_skin_tone` | Detects skin, eye, lip, eyebrow and hair colors as hex values, with eye and hair color names. |
| `youcam_analyze_fitzpatrick` | Classifies the Fitzpatrick skin type (I-VI) and how the skin reacts to sun. Used for sun-protection advice. JPEG only. |
| `youcam_analyze_face` | Face shape, eye, brow, lip and nose traits, cheekbones and facial ratios. Up to 28 features; defaults to a standard set of 26. |

## Simulations

These generate images. Results are saved on the server and returned as file paths, because YouCam only hosts a result for 2 hours.

| Tool | What it does |
|------|--------------|
| `youcam_simulate_aging` | A series of photos of the user from youth to old age, from a single selfie. JPEG only, one face. |
| `youcam_simulate_skin` | Shows how the skin could look after improving chosen concerns. Each concern gets an intensity from 0.0 (original) to 1.0 (strongest improvement). |
| `youcam_detect_faces` | Finds faces in a photo and returns their bounding boxes. The array position is the `faceIndex` used by reshape. |
| `youcam_reshape_face` | Previews a cosmetic reshape of the face, eyes, nose and lips, with optional skin smoothing. Values are integers and 0 leaves a feature unchanged. |

## Which image is used

Every YouCam tool takes an optional `imagePath`:

- **Omitted** → the user's most recent scan photo.
- **A specific day or older photo** → Gemma calls `get_scan_history` with `startDate` / `endDate`, then passes that scan's image path.
- **An image the user attached in chat** → its saved path is appended to the message data, and Gemma passes it through.

Paths are validated before use: only saved images under `uploads/image/` are accepted, with no path traversal, and an optional ownership check confirms the image belongs to the user.

## Costs and limits

Some calls use YouCam credits, so Gemma is told to prefer existing data and to call these tools only when the user wants a new result.

| Tool | Cost | Notes |
|------|------|-------|
| `youcam_simulate_aging` | 2 units | JPEG only, one face |
| `youcam_simulate_skin` | 4 units for 1-4 concerns, 6 for 5-10 | Face must fill at least 60% of the image width |
| `youcam_reshape_face` | 1 unit | Face angle under 30° |
| `youcam_analyze_face` | 10 units for 1-5 features, 20 for 6-14, 30 for 15-28 | Request only the features the question needs |

All images must be JPEG or PNG and smaller than 10 MB (the aging simulation and Fitzpatrick analysis accept JPEG only).

## Behaviour rules

- **Reuse before re-running.** For existing results Gemma reads scan history instead of calling `youcam_analyze_skin` again.
- **Only on request.** Simulations and reshapes run only when the user asks for them, and reshapes stay modest.
- **Saved results.** Generated images are stored and sent to the chat as paths, never as temporary YouCam URLs.
- **Errors are readable.** Unsupported formats, missing faces or bad angles come back to Gemma as clear tool errors it can explain to the user.

## Configuration

```bash
YOUCAM_API_KEY=your_key
YOUCAM_BASE_URL=your_youcam_api_host
```

The key is secret and the service runs server-side only. Never expose it to the browser.

---

# 🤖 Gemma 4 AI Agent

Gemma 4 is responsible for reasoning.

Rather than answering immediately, the AI first gathers context using function calling.

It can:

- Retrieve previous scans
- Retrieve summaries
- Retrieve observations
- Retrieve routines
- Retrieve routine adherence
- Retrieve recommendations
- Retrieve user preferences
- Retrieve taste insights from Qloo
- Run fresh YouCam analyses and simulations on a chosen photo
- Search Google when necessary

After collecting enough information, it:

- Compares the current scan with previous scans
- Detects improvements and deterioration
- Generates personalized skincare insights
- Creates recommendations
- Stores summaries and observations
- Responds naturally to the user

---

# 🎨 Qloo Taste Intelligence

Skin analysis tells Alina **what the skin needs**. [Qloo](https://qloo.com) tells Alina **what this person will actually love**. Together they produce recommendations that are both correct for the skin and appealing to the user.

Qloo is a cultural taste and affinity engine. Given a person's favorite brands plus coarse context (age range, gender, city), it ranks brands, places, people and podcasts by how likely that person is to enjoy them.

## What Alina uses Qloo for

| Capability | Brands | Products | Places | Influencers | Podcasts |
|------------|:------:|:--------:|:------:|:-----------:|:--------:|
| **Recommend** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Compare** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Trending** | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Products:** Qloo has no product entity type, so product results are built from brand affinity. Gemma then picks specific products from Alina's own catalog or confirms real ones with Google Search. It never invents a product.
>
> **Influencers:** these are Qloo `person` results (public figures). Gemma verifies they actually cover skincare before presenting them as skincare influencers.

## Qloo tools

Qloo is exposed to Gemma as three **read-only** function-calling tools. Each takes an `entityType` of `brand`, `product`, `place`, `person` or `podcast`.

| Tool | What it does |
|------|--------------|
| `qloo_recommend` | Recommends brands, products, places, influencers or podcasts tailored to the user's taste |
| `qloo_compare` | Compares 2-4 items: shared and distinct traits, popularity trend, and how close each is to the user's taste |
| `qloo_trending` | Lists what is trending for the user's age range, gender and city, or checks whether specific items are rising, steady or falling |

None of these tools saves anything. They only inform what Gemma says or what it later saves through the `recommend_*` tools.

## Where the data comes from

| Source | Used for |
|--------|----------|
| `Preference.favoriteBrands` | Taste seeds sent to Qloo |
| `User.dateOfBirth` | Converted to an age range on the server, never sent as a date |
| `User.gender` | Optional demographic signal |
| `User.city` | Location for places and local trends |
| Gemma itself | Extra interests the user just mentioned, or names surfaced by other tools |

## Qloo flow

```text
User asks about a brand, product, place, influencer or podcast
                │
                ▼
          Gemma 4 Agent
                │
     ┌──────────┼──────────────┐
     ▼          ▼              ▼
 get_preferences  qloo_recommend / qloo_compare / qloo_trending
     │          │
     │          ▼
     │   Resolve favorite brands → Qloo entities
     │          │
     │          ▼
     │   Rank by taste + age range + gender + city
     │          │
     │          ▼
     │   Redis cache (fail-open)
     │          │
     └────┬─────┘
          ▼
 Gemma filters by skin needs, avoided ingredients and budget
          │
          ▼
 Answers in chat, or saves via recommend_* tools when asked
```

## Behaviour rules

- **Skin comes first.** Taste only chooses between options that already suit the skin. It never overrides skin needs, avoided ingredients or budget.
- **Chat without saving.** Gemma consults Qloo even in plain conversation, but only calls the saving tools (`recommend_product`, `recommend_routine`, `recommend_routine_step`) when the user wants something created.
- **Graceful degradation.** If Qloo has no data, is unavailable, or the user has no taste data, Alina answers from skin needs and saved preferences without surfacing an error.
- **No creepy inference.** Alina never tells the user it used their age, gender or location.

## Privacy

- Only brand names, an age range, an optional gender and a city (for places and local trends) leave the server.
- Scan data, images, skin type, skin tone, name, email, phone number, IP address and postal code are **never** sent to Qloo.
- Cache keys are hashed, so Redis holds no personal data in keys.

## Caching

Qloo responses are cached server-side in Redis with short, purpose-specific lifetimes (recommendations, trends, comparisons and entity lookups each have their own). The cache fails open: if Redis is unavailable, Alina simply calls Qloo directly. Identical concurrent requests share a single upstream call.

## Configuration

```bash
QLOO_API_KEY=your_key
QLOO_API_URL=https://hackathon.api.qloo.com
```

Hackathon keys only work against the hackathon host above. Production requires a production key and `QLOO_API_URL` pointed at the production host.

---

# 🖼 Chat Images

Users can send images in the chat and Alina can send images back.

- **Sending:** attach with the image button, paste into the message box, or drag onto the chat. JPEG or PNG, up to 4 images, each under 10 MB.
- **Receiving:** images Alina generates (aging series, skin simulation, face reshape) appear in the conversation above her reply, and any image opens full size on click.
- **Agent link:** a sent image is saved on the server and its path is passed to the YouCam tools as `imagePath`.
- **History:** images are stored on the message, so they are still there when the conversation is reloaded.

---

# ⚡ Scan Pipeline

```text
User Uploads Image
        │
        ▼
YouCam AI Analysis
        │
        ▼
Store Scan
        │
        ▼
Background AI Job
        │
        ▼
Gemma 4 Agent
        │
        ├──────── Retrieve History
        ├──────── Compare Previous Scans
        ├──────── Analyze Trends
        ├──────── Save Observations
        ├──────── Save Summaries
        ├──────── Tailor Picks to User Taste (Qloo)
        ├──────── Recommend Products
        └──────── Recommend Routine
                 │
                 ▼
            Notify User
```

---

# 💬 AI Workflow

```text
Prompt

↓

Reason

↓

Need More Information?

↓

Yes

↓

Call Tool(s)

↓

Receive Results

↓

Continue Reasoning

↓

Enough Information?

↓

Yes

↓

Generate Final Response
```

---

# 🛠 Function Calling

Gemma interacts with the application through tools instead of relying only on prompt context.

### Read

- Scan History
- Previous Observations
- Previous Summaries
- Recommendations
- Routines
- Routine Logs
- User Preferences

### Vision (YouCam)

- Analyze Skin
- Analyze Skin Tone
- Analyze Fitzpatrick Type
- Analyze Face (attributes and ratios)
- Simulate Aging
- Simulate Skin Improvement
- Detect Faces
- Reshape Face

### Taste (Qloo, read-only)

- Recommend (brands, products, places, influencers, podcasts)
- Compare (brands, products, places, influencers, podcasts)
- Trending (brands, products, places, influencers, podcasts)

### Write

- Create Summary
- Create Observation
- Recommend Product
- Recommend Routine
- Recommend Routine Step
- Create Routine

### Search

- Google Search

---

# 🎯 Design Philosophy

Alina follows a few important principles.

✅ Analyze before recommending

✅ Never invent user data

✅ Compare every scan with history

✅ Personalize every recommendation

✅ Tailor picks to the user's taste, with skin needs always first

✅ Prefer tools over guessing

✅ Reuse saved scan data before spending YouCam credits

✅ Explain recommendations in plain language

✅ Help users build long-term skincare habits

---

# 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| Gemma 4 | AI reasoning |
| YouCam AI | Facial skin analysis, face analysis and image simulations |
| Qloo | Taste intelligence and recommendations |
| Fastify | Backend |
| TypeScript | Application language |
| Prisma ORM v8 | Database |
| PostgreSQL | Data storage |
| Redis | Caching |
| BullMQ | Background jobs |
| WebSocket | Real-time updates |
| React (Vite) | Frontend |

---

# 🛠 Setup and Running Locally

## Prerequisites

- **Node.js** `^22.18.0` or `^24.11.0`
- **PostgreSQL** running locally (or via Docker)
- **Redis** running locally (or via Docker)
- **npm** `^12.2.0`

---

## 1. Clone the repository

```bash
git clone https://github.com/GoldenThrust/alina.git
cd alina
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

### Server

```bash
cp apps/server/.env.example apps/server/.env
```

Open `apps/server/.env` and fill in:

```env
# Database
DATABASE_URL=postgresql://postgres:root@localhost:5432/alina?schema=public

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=                        # leave blank if no password

# JWT — replace with your own long random strings
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxx

# YouCam Skin Analysis
YOUCAM_BASE_URL=https://yce-api-01.makeupar.com
YOUCAM_API_KEY=your_youcam_api_key

# Qloo Taste Intelligence
QLOO_API_URL=https://hackathon.api.qloo.com
QLOO_API_KEY=your_qloo_api_key

# Google AI (Gemma)
GOOGLE_API_KEY=your_google_api_key

# OAuth (optional — only needed if using social login)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3155/auth/google/callback
```

### Client

```bash
cp apps/client/.env.example apps/client/.env
```

The default value works for local development:

```env
VITE_SERVER_URL=http://localhost
```

---

## 4. Set up the database

Make sure PostgreSQL is running, then run the following from `apps/server`:

```bash
cd apps/server
```

**First time only — generate the contract and initialise the database:**

```bash
npx prisma contract emit   # generate the typed database contract from the schema
npx prisma db init         # create the database and apply the baseline schema
```

**Create and apply a new migration after any schema change:**

```bash
npx prisma migration new   # author a new migration file
npx prisma db migrate      # apply pending migrations to the database
```

Optionally seed demo data:

```bash
npm run db:seed
```

---

## 5. Start the development servers

From the root of the repository, run both the API and the frontend together:

```bash
npm run dev
```

Or start them separately in two terminals:

```bash
# Terminal 1 — API
cd apps/server
npm run dev

# Terminal 2 — Frontend
cd apps/client
npm run dev
```

Then open the Vite URL shown in the client terminal (default: `http://localhost:5173`).

---

## 6. Required services at a glance

| Service | Default address | Required |
|---------|----------------|----------|
| PostgreSQL | `localhost:5432` | ✅ |
| Redis | `localhost:6379` | ✅ |
| YouCam API | external | ✅ for scanning |
| Google AI (Gemma 4) | external | ✅ for AI chat |
| Qloo API | external | ✅ for recommendations |
| Resend (email) | external | For registration emails |

---

## 7. Optional: observability stack

A Docker Compose file is included for Prometheus, Grafana, Loki, and Promtail. This is not required to run the app.

```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Grafana | `http://localhost:3000` |
| Prometheus | `http://localhost:9090` |
| Loki | `http://localhost:3100` |

---

# 🌟 Future Vision

Alina is designed to become a long-term AI skincare companion.

The current version focuses on intelligent skin analysis using **YouCam AI** and **Gemma 4**, with future iterations expanding the platform while keeping the same AI agent architecture.

---

<div align="center">

### Built with ❤️ for healthier skin through AI.

</div>