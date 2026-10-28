# Alina — Client

React + TypeScript + Vite frontend for Alina AI.

---

## Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript 6 | Application language |
| Vite 8 | Build tool and dev server |
| React Router 8 | Client-side routing |
| Zustand 5 | Client state management |
| Motion (Framer) | Animations |
| Recharts | Progress and trend charts |
| Socket.IO Client | Real-time chat and notifications |
| Lucide React | Icons |
| React Hot Toast | Toast notifications |
| Tailwind CSS 4 | Utility styles |
| Oxlint | Linting |

---

## Prerequisites

- Node.js `^22.18.0` or `^24.11.0`
- The API server running at `http://localhost:3155` (see `apps/server`)

---

## Setup

### 1. Install dependencies

From the `apps/client` directory:

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

The default works for local development:

```env
VITE_SERVER_URL=http://localhost
```

Change this if the API server runs on a different host or port.

### 3. Start the development server

```bash
npm run dev
```

Open the URL shown in the terminal (default: `http://localhost:5173`).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build locally |

---

## Screens

| Route | Screen |
|-------|--------|
| `/` | Landing |
| `/login` | Login |
| `/register` | Register |
| `/account-verification/:token` | Email verification |
| `/dashboard` | Dashboard — current skin summary, score, timeline, quick actions |
| `/scan` | Scan — camera capture or photo upload |
| `/scan-result` | Scan Result — attributes, radar chart, next actions |
| `/scan-result/:scanId` | Scan Result for a specific past scan |
| `/progress` | Progress — trend chart, movement signals, date range picker |
| `/recommendations` | Recommendations — Qloo-backed product cards |
| `/chat` | Chat — real-time conversation with Alina |
| `/routine` | Routine — daily steps, streak, period tabs |
| `/profile` | Profile — account details and skin preferences |
| `/subscription` | Subscription — visual plan comparison (display only) |

---

## Project structure

```text
src/
├── App.tsx             # Route tree and application shell
├── main.tsx            # React entry point
├── index.css           # Global styles and design tokens
├── pages/              # One file per screen
├── components/         # Shared UI components (navigation, panels, charts)
├── layouts/            # AppLayout (authenticated) and AuthLayout (public)
├── hooks/              # Data-fetching and UI hooks
├── services/           # Typed API clients (auth, scan, chat, etc.)
├── stores/             # Zustand stores (auth, scan, chat, routine, etc.)
├── context/            # React context providers (Socket.IO)
├── types/              # Shared TypeScript types
└── utils/              # Date helpers, motion presets, analysis metadata
```

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | `http://localhost` | Base URL of the Alina API server |
