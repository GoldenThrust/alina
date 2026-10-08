---
doc: scope
status: approved
---

# Alina

A camera-assisted, AI-native skincare journal that turns repeated skin scans into a personal history of skin changes, plain-language insights, and personalized routine recommendations.

## The Unique Kernel

Alina is not a one-time skin analyzer. Its distinctive value is the continuous agentic loop: capture a scan, understand the current skin state, compare it with prior scans, explain what changed, and recommend the next useful action while preserving the user's preferences and control.

## Who It's For

Skincare enthusiasts who want detailed trends and comparisons across days, weeks, and months. They are interested in tracking a routine, understanding why their skin changes, and receiving recommendations that reflect both their skin needs and their personal preferences.

## The Core Loop

A user asks to scan their skin or presses the scan control. The application captures or selects a test image, validates the face and image quality with OpenCV, sends the frame to YouCam Skin Analysis, stores the result, and displays the current scan alongside prior results. The user then asks a follow-up question such as, "Has my skin improved since last week?" The AI retrieves the relevant history, compares the scans, explains meaningful changes in plain language, and recommends a product or routine.

The user can then choose to add the recommendation to their routine or start a PayPal checkout flow. Payment requires explicit confirmation and is never performed automatically.

## Inspiration & Identity

The experience should feel like a quiet, knowledgeable personal assistant rather than a conventional dashboard. It should make progress visible without overwhelming the user, use plain language for skin metrics, and remember conversations and scans over time.

The visual direction should be modern, calm, and trustworthy. Historical trends should feel as important as the current result, and recommendations should explain why they match the user's skin and preferences.

## Why This Matters to the Learner

The learner wants to understand how quickly a product can move from idea to working proof of concept and how an AI agent can coordinate multiple tools, maintain context, and support a complete user workflow. The project should teach agent orchestration, computer-vision integration, historical data analysis, personalization, voice interaction, and commerce without requiring a fully production-scale platform.

## What "Working" Looks Like

A user can start a scan from the dashboard or through Alexa, review the current YouCam results, ask how the skin has changed since the previous scan, receive a plain-language explanation, and see a personalized recommendation. The user can then choose to add the recommendation to their routine or begin a PayPal checkout request after explicit confirmation.

The proof should be convincing in a short demo: one real skin-analysis response, two or more saved scans, a historical comparison, an AI-generated explanation, and a recommendation that reflects a small local preference profile.

## The POC Boundary

### In

- Camera-agnostic capture interface with a simulated/test camera source for the MVP
- OpenCV face detection, alignment, quality validation, and best-frame selection
- Real YouCam Skin Analysis API integration
- Persistent skin-history records and trend comparisons
- An AI agent that calls the camera, analysis, history, and recommendation tools
- Dashboard with current results, recent history, trend summaries, and recommendations
- Small user-preference profile for brand, routine, and lifestyle preferences
- Required Qloo product lookup with a controlled local catalog fallback
- Alexa-style voice entry through a button or accessible invocation path
- Add-to-routine workflow
- PayPal checkout request with explicit user approval
- Authentication, basic error handling, and audit-friendly tool calls
- A short demo flow that can be run locally and demonstrated without production hardware

### Later

- Live Ring or other proprietary camera integrations
- Real-time Alexa+ integration and autonomous voice orchestration
- Product search, cart, inventory, and payment completion
- Proactive reminders and personalized notifications
- Multi-user and household profiles
- Health or medical claims, diagnosis, or treatment advice
- Multi-modal or longitudinal wellness tracking beyond skincare
- Shared beauty-consultant reports and team workflows
- A general-purpose agent platform across unrelated wellness domains

## Explicitly Cut

- Full production-grade camera hardware and a real Ring integration
- Live PayPal checkout completion rather than a confirmed checkout request
- Voice-first automation through Alexa+ rather than a dashboard fallback
- Advanced product catalog, commerce, inventory, and fulfillment systems
- Broad wellness data collection beyond skin history
- Automated purchase execution and any unapproved payment behavior
- A complete multi-device or multi-camera platform

## Later

- Camera-agnostic device adapters
- Nutrition, wearable, weather, calendar, and other wellness tools
- Household profiles and shared insights
- Proactive wellness reminders and trend alerts
- Agentic commerce with a separate payment provider adapter
- Broader agent tool registry and reusable orchestration services
