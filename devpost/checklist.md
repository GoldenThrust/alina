---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. All twelve Alina screens form a navigable visual prototype**
  Becomes usable: The user can move through Landing, Login, Register, Dashboard, Scan, Scan Result, Progress, Recommendations, Chat, Routine, Profile, and a presentation-only Subscription screen in a responsive interface based on the supplied reference.
  Why now: The active client entry currently renders a single baseline page; the Landing, Dashboard, and Scan page files checked are empty. A complete navigable prototype gives the learner an early, reviewable product and lets feedback shape the service integrations that follow.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > First-Use Experience`, `prd.md > What We're Building`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Look and Feel`, `spec.md > Components`, `spec.md > File Structure`
  Build: Reuse the existing app/client setup. Add routing, the responsive public/app navigation shells, all twelve screens, consistent reference-led styling, and clearly labeled seeded demo content. Connect Login/Register to the existing mounted server auth routes with real validation and error states; do not simulate successful authentication. Subscription remains visual-only; do not add subscription billing. Do not scaffold another project or duplicate app/server setup.
  Verify (mechanical): Run the client lint and production build; launch the client and visit all twelve screens through navigation, confirming each renders without runtime errors at desktop and mobile widths. Verify Login/Register form validation and the mounted auth API's response states without exposing credentials.
  Learner check: Open the app, navigate through all twelve screens, try the visible actions, and tell me what feels closest to or furthest from the supplied reference.
  Commit: `Build Alina's twelve-screen UI prototype`

- [x] **2. A valid frame becomes a normalized YouCam scan**
  Becomes usable: The user can capture or upload an image, the backend validates it, and a successful YouCam response becomes a persisted normalized scan.
  Why now: Proves the most unfamiliar external integration and enforces the boundary between browser capture and skin analysis.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Scan Failure and Retry`, `prd.md > What We're Building`
  Spec ref: `spec.md > Camera Capture`, `spec.md > YouCam Analysis Client`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Add the camera abstraction, YouCam client, timeout and error translation, and scan persistence. Keep the request and response contracts typed and ensure frames are validated before reaching YouCam.
  Verify (mechanical): Use the seeded image or a test image to confirm YouCam normalization, persisted attributes, and a complete scan record. Exercise one rejected frame and confirm the correction path.
  Learner check: Try the scan flow, inspect the resulting current summary, and explain what happens when the camera or image is invalid.
  Commit: `Add validated scan pipeline`

- [x] **3. The user can compare scans and ask Alina questions**
  Becomes usable: A user can revisit prior scans, see a compact timeline and historical comparison, and ask conversational questions that use stored evidence.
  Why now: Completes the core history loop and makes the product more than a one-time analyzer.
  PRD ref: `prd.md > Recent Scans Timeline`, `prd.md > Conversation and Historical Comparison`, `prd.md > Conversation State and Persistence`, `prd.md > Confidence and Scan Milestones`
  Spec ref: `spec.md > Scan and History Service`, `spec.md > AI Agent`, `spec.md > Data Model`, `spec.md > Persistence Behavior`
  Build: Add the scan-history API, comparison and trend calculations, conversation persistence, and assistant responses that distinguish current evidence from prior history and state confidence limits.
  Verify (mechanical): Create two scans with controlled results, verify the timeline and comparison, then ask a history question and confirm the answer cites the relevant stored evidence.
  Learner check: Scan twice, ask "What changed?" and "What is still uncertain?", and confirm the response is understandable and appropriately qualified.
  Commit: `Add scan history and conversation`

- [x] **4. Qloo powers a recommendation with a disclosed fallback**
  Becomes usable: The agent generates a recommendation from the current scan, history, and local preferences using Qloo; if Qloo is unavailable, the user can explicitly accept a clearly identified local-catalog fallback.
  Why now: Implements the required recommendation path and prevents the technical plan from silently weakening the Qloo contract.
  PRD ref: `prd.md > Recommendation Experience`, `prd.md > Product Decisions`, `prd.md > What We're Building`, `prd.md > Non-Goals`
  Spec ref: `spec.md > Recommendation and Product Catalog`, `spec.md > Qloo`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues`
  Build: Add the Qloo client and contract, preference profile, recommendation service, retry behavior, fallback disclosure, and agent tool.
  Verify (mechanical): Run the Qloo contract test with a controlled response, confirm the recommendation reflects preferences and evidence, then simulate an unavailable response and verify the single retry and explicit fallback choice.
  Learner check: Review the recommendation, confirm the explanation and confidence limits, and verify that the UI clearly identifies whether Qloo or local fallback produced it.
  Commit: `Add Qloo-backed recommendations`

- [x] **5. Routine actions work; checkout intent deferred**
  Becomes usable: The user can add a recommendation to their routine and manage routine steps. PayPal checkout is deferred to a future build; the checkout action is removed from this POC.
  Why now: Completes the user-controlled routine workflow within the revised POC boundary.
  PRD ref: `prd.md > Recommendation Experience`, `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Routine and Checkout Actions`, `spec.md > Important Failure Modes`
  Build: Add routine-item persistence and the add-to-routine flow. PayPal checkout is cut from this POC; no checkout action is implemented.
  Verify (mechanical): Add a recommendation to the routine and confirm it persists.
  Learner check: Try the add-to-routine action and confirm the item appears in the Routine screen.
  Commit: `Add routine actions`

## Hands-on Checkpoints

- [x] Early usable behavior explored — all twelve screens after slice 1
- [x] Qloo recommendation contract reviewed and accepted — slice 4
- [x] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

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

- Expanded the approved POC to include all twelve supplied reference screens; Subscription is presentation-only with no billing or subscription payment, as approved by the learner.
- Reset the former Slice 1 completion because it described a different app shell; the active `app/client/src/App.tsx` is a single baseline screen, and the checked Landing, Dashboard, and Scan page files were empty placeholders.
- The client Login/Register forms have native validation and surface API errors, but real account auth is blocked: the current server dev entry is a seed stub with no loaded Prisma binding, while the Fastify entry has unresolved generated Prisma imports.
- OpenCV frame validation removed from the scan pipeline; the learner decided not to use OpenCV in this POC. Frame validation now happens within the existing YouCam integration boundary.
- PayPal checkout removed from the POC. The checkout intent flow (Slice 5) was cut entirely. PayPal may be added in a future build; it is not implemented here.
