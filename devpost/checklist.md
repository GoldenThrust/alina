---
doc: checklist
status: draft
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. The app starts with a usable local skin baseline**
  Becomes usable: A running frontend and API show a first-use welcome state, a seeded scan baseline, and a clear “Start Your First Skin Scan” action.
  Why now: Establishes the project’s runnable shell and assistant-first entry point before integrating external services.
  PRD ref: `prd.md > The Core Journey`, `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure`, `spec.md > Data Model`, `spec.md > Look and Feel`
  Build: Create the monorepo and package scripts, scaffold the React client and Node.js API, add environment configuration, start PostgreSQL through Docker Compose, and provide a seeded local baseline with a testable camera fallback.
  Verify (mechanical): Run the development servers, confirm the API health endpoint and frontend load successfully, and verify the seeded baseline appears without requiring a live camera or external API.
  Learner check: Open the app, confirm the assistant-first home experience, identify the primary action for a first-time user, and review the artistic organic scan visual.
  Commit: `Add runnable Alina baseline`

- [ ] **2. A valid frame becomes a normalized YouCam scan**
  Becomes usable: The user can capture or upload an image, the backend validates it with OpenCV, and a successful YouCam response becomes a persisted normalized scan.
  Why now: Proves the most unfamiliar external integration and enforces the boundary between browser capture, computer vision, and skin analysis.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Scan Failure and Retry`, `prd.md > What We're Building`
  Spec ref: `spec.md > Camera Capture`, `spec.md > OpenCV Validation`, `spec.md > YouCam Analysis Client`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Add the camera abstraction, backend frame validation, YouCam client, timeout and error translation, and scan persistence. Keep the request and response contracts typed and ensure invalid frames never reach YouCam.
  Verify (mechanical): Use the seeded image or a test image to confirm OpenCV acceptance, YouCam normalization, persisted attributes, and a complete scan record. Exercise one rejected frame and confirm the correction path.
  Learner check: Try the scan flow, inspect the resulting current summary, and explain what happens when the camera or image is invalid.
  Commit: `Add validated scan pipeline`

- [ ] **3. The user can compare scans and ask Alina questions**
  Becomes usable: A user can revisit prior scans, see a compact timeline and historical comparison, and ask conversational questions that use stored evidence.
  Why now: Completes the core history loop and makes the product more than a one-time analyzer.
  PRD ref: `prd.md > Recent Scans Timeline`, `prd.md > Conversation and Historical Comparison`, `prd.md > Conversation State and Persistence`, `prd.md > Confidence and Scan Milestones`
  Spec ref: `spec.md > Scan and History Service`, `spec.md > AI Agent`, `spec.md > Data Model`, `spec.md > Persistence Behavior`
  Build: Add the scan-history API, comparison and trend calculations, conversation persistence, and assistant responses that distinguish current evidence from prior history and state confidence limits.
  Verify (mechanical): Create two scans with controlled results, verify the timeline and comparison, then ask a history question and confirm the answer cites the relevant stored evidence.
  Learner check: Scan twice, ask “What changed?” and “What is still uncertain?”, and confirm the response is understandable and appropriately qualified.
  Commit: `Add scan history and conversation`

- [ ] **4. Qloo powers a recommendation with a disclosed fallback**
  Becomes usable: The agent generates a recommendation from the current scan, history, and local preferences using Qloo; if Qloo is unavailable, the user can explicitly accept a clearly identified local-catalog fallback.
  Why now: Implements the required recommendation path and prevents the technical plan from silently weakening the Qloo contract.
  PRD ref: `prd.md > Recommendation Experience`, `prd.md > Product Decisions`, `prd.md > What We're Building`, `prd.md > Non-Goals`
  Spec ref: `spec.md > Recommendation and Product Catalog`, `spec.md > Qloo`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues`
  Build: Add the Qloo client and contract, preference profile, recommendation service, retry behavior, fallback disclosure, and agent tool. Do not consider the recommendation complete without a usable Qloo response unless the user explicitly accepts degraded mode.
  Verify (mechanical): Run the Qloo contract test with a controlled response, confirm the recommendation reflects preferences and evidence, then simulate an unavailable response and verify the single retry and explicit fallback choice.
  Learner check: Review the recommendation, confirm the explanation and confidence limits, and verify that the UI clearly identifies whether Qloo or local fallback produced it.
  Commit: `Add Qloo-backed recommendations`

- [ ] **5. Routine actions and confirmed PayPal checkout intent work**
  Becomes usable: The user can add a recommendation to their routine and begin a PayPal checkout request only after explicit confirmation.
  Why now: Completes the user-controlled commerce boundary without attempting a production payment flow.
  PRD ref: `prd.md > Recommendation Experience`, `prd.md > States and Boundaries`, `prd.md > What We're Building`, `prd.md > Non-Goals`
  Spec ref: `spec.md > Routine and Checkout Actions`, `spec.md > PayPal`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues`
  Build: Add routine-item persistence, checkout-intent persistence, confirmation state, PayPal sandbox or test request integration, and a local confirmation fallback when live payment access is unavailable.
  Verify (mechanical): Add a recommendation to the routine, start checkout, reject confirmation, and verify no payment begins. Then confirm the approved request reaches the configured test endpoint or the local confirmation state.
  Learner check: Try the add-to-routine and checkout actions and confirm that payment completion never happens automatically.
  Commit: `Add routine and checkout actions`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — [slice 1 and the first complete scan path]
- [ ] Qloo recommendation contract reviewed and accepted — [slice 4]
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [what actually happened; real document/test/code references; unfinished work if interrupted]
Route and stops: [actual paths and symbols; guided stops completed, or reference-only route]
Edit outcome: [tried/kept/reverted/declined/not applicable; verification if changed]
Reflection: [offered/answered/declined/already covered — personal answer belongs only in the ignored profile]
Activity mode: [live app and editor, explicit static fallback, focused alternative, prior practice, or recap]

## Revisions
