---
doc: spec
status: approved
---

# Alina — Technical Specification

## How This Works, In Plain Language

Alina is a small local application with a visual frontend, a TypeScript API, and a PostgreSQL database. The browser captures a face image, the backend validates it with OpenCV, and the backend sends the approved frame to YouCam Skin Analysis. The returned skin attributes are stored with the scan, compared with earlier scans, and used to produce a plain-language summary and recommendation.

The AI agent coordinates those steps through tool calls. It does not replace the camera, analysis, history, or recommendation services; it decides which service to use and explains the result in the user’s language.

The proof of concept is intentionally single-user and local-first. It can be run on the learner’s workstation and recorded as a short demo. Optional production deployment is not required for the submission.

## The Core Journey Through the System

The user opens Alina and sees the current summary → the frontend requests the latest scan and history from the API → the API reads PostgreSQL → the user presses Scan → the browser provides a camera frame through the capture interface → the backend validates the frame with OpenCV → the backend sends the frame to YouCam Skin Analysis → the response is stored with the scan → the API returns the current result and comparison → the agent explains the result and produces a recommendation → the user can add the recommendation to their routine or confirm a PayPal checkout request.

PRD ref: `prd.md > The Core Journey`.

## Stack

- **Frontend:** React with TypeScript and a lightweight component library or CSS-based styling.
- **Backend:** Node.js with TypeScript, Fastify or Express, and a typed request/response layer.
- **Database:** PostgreSQL with Prisma or Node.js SQL migrations.
- **Computer vision:** Backend OpenCV process for face detection, alignment, blur, and quality validation.
- **Skin analysis:** YouCam Skin Analysis API through a dedicated client with explicit request and response contracts.
- **AI agent:** A controlled tool-calling agent that receives the current scan, history, and user preferences and returns a concise explanation or recommendation.
- **Persistence:** PostgreSQL stores scans, attributes, preferences, recommendations, conversation state, and routine actions.
- **Testing:** Vitest or Jest for backend unit tests, Playwright for browser workflow tests, and a seeded local test camera or uploaded image for demo automation.

The frontend and backend are separated so the UI can evolve independently from the agent and integration contracts. The learner selected Node.js + TypeScript for the backend; this keeps the full application in one programming language while preserving separate runtime boundaries.

Documentation links will be added for each major dependency after the exact package versions and API access details are confirmed.

## Where It Runs and How Someone Tries It

The application runs locally as two processes:

1. Start the Node.js API and PostgreSQL.
2. Start the React development server.
3. Open the frontend URL shown by the development server.
4. Enter a display name and select the camera permission needed for live capture.
5. Scan the face, review the current result, ask Alina a question, and review the recommendation.
6. Show the latest scan, a second saved scan, a historical comparison, and a recommendation in the demo recording.

The minimum local prerequisites are Node.js 20 or later, PostgreSQL, a YouCam API credential, and an OpenCV-capable runtime. The OpenCV package will run on the backend, so the browser only captures and uploads the frame.

The submission requires a short demo video and a public GitHub repository. A hosted URL is optional and does not replace either requirement. Deployment can be deferred to `6-ship` unless the learner requests a direct sharing link.

## Look and Feel

The interface follows the PRD’s calm, trusted, assistant-first direction.

- Use a modern, warm neutral palette with a restrained green accent.
- Use a clean sans-serif typeface with strong hierarchy and generous spacing.
- Keep the current summary prominent and treat score and trend indicators as supporting evidence.
- Use plain labels such as “Your skin today,” “Recent scans,” “What’s next?”, and “Your skin journey.”
- Use compact cards and directional indicators rather than dense tables or charts.
- Avoid clinical terminology, alarming language, and diagnostic claims in the home screen.
- Keep the experience responsive on desktop and mobile.

The styling implementation must remain proportional to the POC and must not introduce a full design system.

## Components

### Frontend

The frontend owns the user-facing screen, camera capture, and interaction state. It calls the backend API and renders the current summary, score, timeline, history, recommendation, and quick actions.

PRD ref: `prd.md > Screens and Layout`, `prd.md > Home Screen and Current Understanding`, `prd.md > Recent Scans Timeline`, `prd.md > Quick Actions`, and `prd.md > Conversation State and Persistence`.

### Camera Capture

The camera component obtains a live frame through the browser camera API and exposes a camera-agnostic capture contract. It handles permission denial, capture errors, and frame-size normalization before sending the frame to the backend.

PRD ref: `prd.md > Scan Preparation Guidance`, `prd.md > Scan Failure and Retry`, and `prd.md > States and Boundaries`.

### OpenCV Validation

The backend validates each frame before calling YouCam. The browser sends the raw frame to the backend, which checks for a visible face, acceptable alignment, sufficient brightness, acceptable blur, and a usable capture. The validation service returns a structured result containing the reason for rejection or the approved frame metadata.

PRD ref: `prd.md > Scan Failure and Retry` and `prd.md > States and Boundaries`.

### YouCam Analysis Client

The YouCam client owns authentication, request construction, response parsing, timeout handling, and API error translation. It receives a validated frame and returns a normalized skin-analysis result.

PRD ref: `prd.md > Home Screen and Current Understanding`, `prd.md > Current Skin Score and Supporting Trends`, and `prd.md > What We're Building`.

### Scan and History Service

The scan service persists the normalized analysis response, source frame metadata, scan timestamp, and comparison information. It returns the latest scan, recent history, and trend snapshots without exposing unmanaged raw data to the frontend.

PRD ref: `prd.md > Recent Scans Timeline`, `prd.md > Conversation and Historical Comparison`, `prd.md > Confidence and Scan Milestones`, and `prd.md > Conversation State and Persistence`.

### AI Agent

The AI agent receives the current scan, relevant history, user preferences, and current conversation context. It creates a plain-language summary, answers questions, explains confidence limits, and generates a recommendation. It must not invent missing history or claim that an observation is a diagnosis.

PRD ref: `prd.md > Home Screen and Current Understanding`, `prd.md > Conversation and Historical Comparison`, `prd.md > Recommendation Experience`, `prd.md > Confidence and Scan Milestones`, and `prd.md > Conversation State and Persistence`.

### Recommendation and Product Catalog

The recommendation service uses Qloo as the required product-data source and the user’s local preference profile to select a primary product and alternatives. The local curated catalog is a controlled fallback only when Qloo is unavailable, unauthenticated, returns unusable data, or is temporarily failing. The fallback must be visibly identified as degraded mode, and the recommendation flow must not claim that live Qloo data was used.

The recommendation service must fail closed for the normal path: a usable Qloo response is required before the recommendation is considered complete. The implementation should retry transient Qloo failures once, then display a clear degraded-mode message and use the curated catalog only when the user explicitly accepts that fallback. If Qloo credentials, authorization, schema, or availability cannot be established before build, implementation must stop rather than silently weakening the recommendation contract.

PRD ref: `prd.md > Recommendation Experience`, `prd.md > Product Decisions`, and `prd.md > What We're Building`.

### Routine and Checkout Actions

The frontend presents add-to-routine and checkout actions. Add-to-routine stores the selected recommendation or routine item. Checkout requests enter a confirmation state and never complete a payment automatically.

PRD ref: `prd.md > Recommendation Experience`, `prd.md > States and Boundaries`, and `prd.md > What We're Building`.

### Persistence and Preferences

PostgreSQL stores scan history, normalized skin attributes, preferences, recommendations, routine items, conversation entries, and checkout intent. The database is the source of truth for the single-user application.

PRD ref: `prd.md > Conversation State and Persistence`, `prd.md > States and Boundaries`, and `prd.md > What We're Building`.

## Data Model

### User

- `id`
- `display_name`
- `created_at`
- `updated_at`

The user is the single local account. Authentication is intentionally omitted for the POC.

### Scan

- `id`
- `user_id`
- `captured_at`
- `source`
- `camera_frame_metadata`
- `skin_analysis_payload`
- `validation_result`
- `created_at`

The raw frame is stored only when required for the demo or audit trail. The normalized skin attributes are the source of truth for comparisons and summaries.

### Skin Attribute

- `id`
- `scan_id`
- `attribute_name`
- `value`
- `unit`
- `confidence`
- `observed_at`

The initial POC includes the attributes supported by the YouCam response. The schema should allow new attributes without changing the scan-history contract.

### Preference

- `id`
- `user_id`
- `brand_affinity`
- `ingredient_preferences`
- `budget_tier`
- `routine_type`
- `updated_at`

The preference model is intentionally small and local to the user.

### Recommendation

- `id`
- `user_id`
- `scan_id`
- `product_id`
- `routine_item`
- `confidence`
- `explanation`
- `created_at`

A recommendation is a generated suggestion, not a purchase or an irreversible action.

### Routine Item

- `id`
- `user_id`
- `recommendation_id`
- `product_name`
- `status`
- `created_at`

The MVP stores a user-selected item without implementing inventory or fulfillment.

### Conversation Turn

- `id`
- `user_id`
- `scan_id`
- `question`
- `answer`
- `model`
- `created_at`

Conversation entries are persisted so the user can return and continue the same journey. The selection of a model and prompt history remain implementation details behind the API contract.

### Checkout Intent

- `id`
- `user_id`
- `recommendation_id`
- `status`
- `confirmed_at`
- `created_at`

The checkout intent is a request to begin payment. It does not contain payment credentials or complete a transaction.

### Persistence Behavior

- Scans and their normalized results are persisted after successful analysis.
- Failed captures are not persisted as completed scans.
- Preference changes are saved after the user confirms them.
- Conversation and recommendation records are retained between sessions.
- A user can revisit a previous scan from the timeline and history view.

## File Structure

```text
alina/
├── client/
│   ├── src/
│   │   ├── App.tsx                         # Main assistant-first application
│   │   ├── components/
│   │   │   ├── HomeScreen.tsx              # Current summary and quick actions
│   │   │   ├── ScanFlow.tsx               # Camera preparation and capture
│   │   │   ├── ScanTimeline.tsx           # Recent scans
│   │   │   ├── HistoryView.tsx             # Detailed historical comparison
│   │   │   ├── RecommendationCard.tsx      # Recommendation and confidence
│   │   │   └── CheckoutConfirmation.tsx   # Explicit payment request confirmation
│   │   ├── features/
│   │   │   ├── camera/                     # Camera capture abstraction
│   │   │   ├── scans/                      # Scan, history, and result APIs
│   │   │   ├── agent/                      # Conversation and recommendation tools
│   │   │   └── preferences/                # Preference profile
│   │   ├── api/                           # Typed frontend API clients
│   │   ├── types/                         # Shared frontend contracts
│   │   └── styles/                        # Component styling and design tokens
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── app.ts                         # Fastify or Express application setup
│   │   ├── routes/
│   │   │   ├── scans.ts                   # Scan capture and history endpoints
│   │   │   ├── agent.ts                   # Conversation and recommendation endpoints
│   │   │   ├── preferences.ts              # Preference endpoints
│   │   │   └── checkout.ts                 # Checkout intent and confirmation endpoints
│   │   ├── services/
│   │   │   ├── cv/                        # OpenCV validation
│   │   │   ├── youcam/                     # YouCam API client
│   │   │   ├── history/                    # Scan comparison and trends
│   │   │   ├── agent/                      # Agent orchestration and tool calls
│   │   │   └── recommendations/             # Catalog matching and explanation
│   │   ├── repositories/                   # Database query layer
│   │   ├── migrations/                     # PostgreSQL migrations
│   │   ├── config/                         # Environment configuration
│   │   └── types/                          # Shared backend contracts
│   ├── package.json
│   └── tsconfig.json
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   └── checklist.md
├── package.json
├── docker-compose.yml                      # Local PostgreSQL and API services
├── .env.example
├── README.md
└── .gitignore
```

Generated dependency directories, build outputs, and lockfiles are omitted from the conceptual tree. Exact files will be selected during the build.

## External Services and Dependencies

### YouCam Skin Analysis

- **Call:** POST the frame to the YouCam Skin Analysis endpoint with the required authentication header and frame payload.
- **Request:** validated image bytes or an image reference accepted by the API.
- **Response:** normalized skin attributes, confidence values, and metadata needed for the scan result.
- **Authentication:** YouCam API key or access token supplied through environment configuration.
- **Documentation:** Add the official YouCam Skin Analysis API documentation link after access and endpoint details are confirmed.
- **Rate limits:** Confirm the API’s request limits and retry policy before implementation.
- **Cost:** Confirm the API pricing and whether a free test tier is available.

The YouCam response must be normalized into the local schema before it reaches the frontend. The API client must fail safely and return a user-actionable error without storing an incomplete scan.

### PostgreSQL

- **Call:** Local database connection through the backend repository layer.
- **Authentication:** Local database user and password supplied through environment configuration.
- **Schema:** Scan, attribute, user, preference, recommendation, routine, conversation, and checkout-intent tables.
- **Migrations:** Versioned SQL migration files applied at startup or through a command.
- **Documents:** Add the official PostgreSQL documentation link when the selected version is confirmed.
- **Availability:** PostgreSQL must be running before the API starts. Docker Compose will provide a local setup for the demo.

### OpenCV

- **Execution:** Backend OpenCV process in the Node.js service.
- **Functions:** Face detection, face alignment, image quality checks, and best-frame selection.
- **Input:** Captured image bytes sent by the browser.
- **Output:** Validation status, reason, and the approved frame metadata.
- **Documentation:** Add the official OpenCV documentation link after package selection.
- **Fallback:** A seeded test image with validation markers when a live camera is unavailable.

### Qloo

- **Execution:** Required product lookup through the recommendation service for the normal MVP path.
- **Primary data source:** Qloo product records, metadata, and compatibility details.
- **Fallback:** Curated local catalog only for explicitly configured degraded mode, after a single transient retry.
- **Fallback disclosure:** The UI must identify the recommendation as local fallback and must not imply live Qloo data was used.
- **Required gate:** Qloo access, credentials, authorization, response contract, and availability must be verified before implementation.
- **Documentation:** Add the official Qloo documentation link and contract reference before implementation.

### PayPal

- **Execution:** Checkout request only; no payment completion in the POC.
- **Authentication:** PayPal developer credentials supplied through environment configuration when the checkout request is implemented.
- **Call:** A user-confirmed checkout request to a PayPal sandbox or test endpoint.
- **Fallback:** A local confirmation screen that records the intent when live payment access is unavailable.
- **Documentation:** Add the official PayPal developer documentation link after sandbox credentials and transaction requirements are confirmed.

## Important Failure Modes

- **Camera is unavailable or denied** → show a concise permission message and a “Try Again” action.
- **Frame fails OpenCV validation** → explain one correction and return to the capture flow.
- **YouCam API is slow or unavailable** → show a retry message while preserving the current screen and scan state.
- **PostgreSQL is unavailable** → show a local setup message and do not create an incomplete scan.
- **No prior scan exists** → present the first-use baseline experience and the “Start Your First Skin Scan” action.
- **The result has insufficient history** → show current-snapshot guidance and the four-scan progress cue without claiming a trend.
- **Qloo is unavailable or unusable** → retry once, then use the explicitly disclosed curated fallback only if the user accepts degraded mode.
- **Payment confirmation is not approved** → return to the recommendation without starting checkout.

## What Was Simplified and Why

- **Separate frontend and backend instead of a single monolithic app** — this creates clearer API and agent boundaries while remaining small enough for a local demo.
- **PostgreSQL instead of a hosted database** — this preserves a production-like schema and queries while keeping the POC local and reproducible.
- **Live camera capture with a seeded fallback** — this proves the full interaction without requiring a physical device or camera integration.
- **A curated product catalog instead of a full commerce platform** — this tests recommendation quality and checkout intent without inventory, fulfillment, or payment completion.
- **Confirmed PayPal checkout request instead of automatic payment** — this satisfies the user’s control requirement and avoids production payment infrastructure.
- **A single-user profile instead of authentication and multi-user sync** — this keeps the first build focused on the one personal skin journey.
- **Agent tool calls over a local API instead of a general-purpose agent platform** — this demonstrates orchestration without adding unrelated wellness tools or background services.

## Decisions and Open Issues

- **Learner decision:** The POC uses a separate React/TypeScript frontend and Node.js/TypeScript backend.
- **Learner decision:** PostgreSQL is the required persistence layer for the MVP.
- **Learner decision:** Live camera capture is included in the first build, with a seeded fallback for devices or environments without access.
- **Learner decision:** Live YouCam analysis is planned, with acknowledgements that credentials and API access are not yet established.
- **Learner decision:** The four-scan milestone is a progress cue and does not block the first scan or recommendation.
- **Implementation decision:** The frontend and backend will use typed contracts to prevent the UI and agent from depending on raw API payloads.
- **Implementation decision:** OpenCV validation occurs before YouCam analysis so invalid frames never reach the external service.
- **Implementation decision:** PostgreSQL migrations are versioned and applied before the API starts.
- **Implementation decision:** The AI agent will receive only the evidence and context required to answer the current question.
- **Open issue:** Confirm the exact YouCam API URL, authentication method, request payload, and response schema before implementation.
- **Open issue:** Confirm the YouCam API access method, credentials, licensing, and available free-test limits.
- **Open issue:** Confirm Qloo credentials, authorization, rate limits, response schema, availability, and the product catalog contents in the learner’s build environment.
- **Open issue:** Confirm the recommended product count and the fallback catalog’s compatibility with the Qloo result contract.
- **Open issue:** Confirm the PostgreSQL version and local container configuration.
- **Open issue:** Confirm the exact backend OpenCV package and native installation method for the learner’s operating system.
- **Open issue:** Confirm the exact PayPal sandbox or test checkout flow and whether the learner wants it represented as an explicit request only.
