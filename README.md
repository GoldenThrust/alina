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

- **YouCam AI** → Performs facial skin analysis.
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
          Gemma 4 AI Agent
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

✅ Explain recommendations in plain language

✅ Help users build long-term skincare habits

---

# 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| Gemma 4 | AI reasoning |
| YouCam AI | Facial skin analysis |
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

# 🌟 Future Vision

Alina is designed to become a long-term AI skincare companion.

The current version focuses on intelligent skin analysis using **YouCam AI** and **Gemma 4**, with future iterations expanding the platform while keeping the same AI agent architecture.

---

<div align="center">

### Built with ❤️ for healthier skin through AI.

</div>