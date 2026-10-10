---
doc: spec
status: approved
---

# Alina — Technical Specification

## How This Works, In Plain Language

Alina is a local application with a React frontend, a TypeScript API, and PostgreSQL persistence. The browser captures a face image, the backend validates it with OpenCV, and the backend sends the approved frame to YouCam Skin Analysis. The returned skin attributes are stored with the scan, compared with earlier scans, and used to produce a plain-language summary and recommendation.

The AI agent coordinates those steps through tool calls. It does not replace the camera, analysis, history, or recommendation services; it decides which service to use and explains the result in the user’s language.

The proof of concept is intentionally single-user and local-first. It can be run on the learner’s workstation and recorded as a short demo. Optional production deployment is not required for the submission.

## The Core Journey Through the System

The user opens Alina and sees the current summary → the frontend requests the latest scan and history from the API → the API reads PostgreSQL → the user presses Scan → the browser provides a camera frame through the capture interface → the backend validates the frame with OpenCV → the backend sends the frame to YouCam Skin Analysis → the response is stored with the scan → the API returns the current result and comparison → the agent explains the result and produces a recommendation → the user can add the recommendation to their routine or confirm a PayPal checkout request.

PRD ref: `prd.md > The Core Journey`.

## Stack

- **Frontend:** React with TypeScript and Vite, using the existing `app/client` package and dependencies.
- **Backend:** Node.js with TypeScript and the existing Fastify server in `app/server`.
- **Database:** PostgreSQL through the existing Prisma configuration and migration workflow.
- **Computer vision:** Backend OpenCV process for face detection, alignment, blur, and quality validation.
- **Skin analysis:** YouCam Skin Analysis API through a dedicated client with explicit request and response contracts.
- **AI agent:** A controlled tool-calling agent that receives the current scan, history, and user preferences and returns a concise explanation or recommendation.
- **Persistence:** PostgreSQL stores scans, attributes, preferences, recommendations, conversation state, routine actions, and checkout intent.
- **Testing:** Reuse the existing client lint/build and server test/type-check scripts; add no new test framework solely for the visual prototype.

The frontend and backend are separated so the UI can evolve independently from the agent and integration contracts. Reuse the installed package versions and scripts rather than scaffolding another application or replacing the chosen stack.

## Where It Runs and How Someone Tries It

The application runs locally as two processes, using the existing manifests:

1. Apply or verify the configured database migration from `app/server`.
2. Start the API with `npm run dev` from `app/server`.
3. Start the frontend with `npm run dev` from `app/client`.
4. Open the Vite URL shown by the client development server.
5. Navigate through the twelve screens, then try the scan, history, chat, and recommendation journeys as their real integrations are added.
6. The Subscription page is a visual comparison only and does not start billing or payment.

The minimum local prerequisites are the Node.js version declared by the server package, the configured PostgreSQL service, and service credentials when an external integration is exercised. The frontend prototype must remain reviewable with its explicitly labeled seeded demo content.

The submission requires a short demo video and a public GitHub repository. A hosted URL is optional and does not replace either requirement. Deployment can be deferred to `6-ship` unless the learner requests a direct sharing link.

## Look and Feel

The interface follows the supplied reference’s airy skincare-product layout while keeping Alina’s language calm, trusted, and non-clinical.

- Use light neutral surfaces, crisp readable text, generous spacing, and a restrained violet primary accent with distinct, quiet trend-status colors.
- Use compact public navigation and a consistent signed-in navigation rail; adapt it for narrow screens.
- Keep pages focused on one primary task and make active navigation obvious.
- Keep the current skin summary prominent and use scores and trends only as supporting evidence.
- Use compact repeated information rather than nested cards or dense analytics panels.
- Avoid clinical terminology, alarming language, and diagnostic claims.
- Clearly identify seeded content as demo data until it is connected to a live service.
- Keep Subscription presentational, without billing, plan enforcement, or subscription checkout.

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

The existing server auth module owns registration and login. The POC keeps one personal skin journey per signed-in user and does not add household profiles or multi-user sharing.

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
├── app/
│   ├── client/
│   │   ├── src/
│   │   │   ├── App.tsx                     # Route tree and application shell
│   │   │   ├── components/                 # Shared navigation and UI components
│   │   │   ├── pages/                       # Twelve screen components
│   │   │   ├── features/                    # Camera, scans, agent, preferences
│   │   │   ├── services/                    # Typed API clients
│   │   │   ├── stores/                      # Client interaction state
│   │   │   ├── types/                       # Frontend contracts
│   │   │   └── index.css                    # Global styles and design tokens
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/
│       ├── src/
│       │   ├── app.ts                       # Existing Fastify application
│       │   ├── routes/                      # API route registration
│       │   ├── modules/auth/                # Existing authentication module
│       │   ├── services/                    # Integration and domain services
│       │   ├── prisma/                      # Prisma Composer/PostgreSQL layer
│       │   ├── config/                      # Environment and service configuration
│       │   └── tests/                       # Unit and integration tests
│       ├── package.json
│       └── prisma.config.ts
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   └── checklist.md
└── .gitignore
```

This map reflects the active `app/client` and `app/server` layout. Reuse their existing manifests, Vite setup, Fastify server, and Prisma configuration; do not scaffold a second project or assume root-level client/server directories. Generated dependency directories, build outputs, and lockfiles are omitted.

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
- **One personal skin journey with the existing account auth module instead of household profiles and multi-user sharing** — this keeps the build focused on the POC user journey.
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
