<div align="center">

# ✨ Alina AI

### Intelligent AI-powered skincare assistant built with **Gemma 4** + **YouCam AI**

Analyze • Understand • Track • Improve

---

[![Gemma 4](https://img.shields.io/badge/Gemma-4-blue?style=for-the-badge)](#)
[![YouCam AI](https://img.shields.io/badge/YouCam-AI-purple?style=for-the-badge)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black?style=for-the-badge&logo=fastify)](#)
[![Prisma](https://img.shields.io/badge/Prisma-v8-2D3748?style=for-the-badge&logo=prisma)](#)

</div>

---

# 📖 Overview

Alina AI is an intelligent skincare assistant that combines **computer vision** with **large language models** to help users understand their skin over time.

Instead of simply showing skin scores, Alina analyzes every scan, compares it with historical data, remembers previous recommendations, and generates personalized skincare guidance.

The AI is powered by two major components:

- **YouCam AI** → Performs facial skin analysis.
- **Gemma 4** → Understands, reasons, compares history, and creates personalized observations and recommendations.

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
- Search Google when necessary

After collecting enough information, it:

- Compares the current scan with previous scans
- Detects improvements and deterioration
- Generates personalized skincare insights
- Creates recommendations
- Stores summaries and observations
- Responds naturally to the user

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

✅ Prefer tools over guessing

✅ Explain recommendations in plain language

✅ Help users build long-term skincare habits

---

# 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| Gemma 4 | AI reasoning |
| YouCam AI | Facial skin analysis |
| Fastify | Backend |
| TypeScript | Application language |
| Prisma ORM v8 | Database |
| PostgreSQL | Data storage |
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