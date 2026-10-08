---
doc: prd
status: approved
---

# Alina — Product Requirements

Alina is a personal AI skincare assistant that turns repeated skin scans into a clear, conversational record of progress. It is designed for skincare enthusiasts who want to understand what is changing, receive useful guidance, and build a longer-term skincare routine.

Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`, `scope.md > The Core Loop`, and `scope.md > What "Working" Looks Like`.

## The Core Journey

1. The user opens Alina and receives a concise understanding of their skin today.
2. Alina presents the current result and a small amount of evidence showing how it has changed.
3. The user understands what is improving, what needs attention, and what Alina recommends next.
4. The user can scan again, ask a question, review progress, or inspect personalized recommendations.
5. When the user has completed enough scans, Alina can explain meaningful trends and provide more tailored guidance.

The product’s success is not measured by the amount of data displayed. It is measured by whether the user can understand their current skin condition and decide what to do next within a few seconds.

## Screens and Layout

The primary product surface is a single home screen. It is intentionally assistant-first: the user sees a personal summary and a clear next action rather than a dashboard full of charts or medical-style information.

The home screen is organized in this order:

1. **Present moment:** a greeting and a plain-language summary of the user's skin today.
2. **Evidence:** a compact skin score and a short timeline showing the latest available scans.
3. **Next step:** a contextual recommendation or prompt for the user to scan again, ask Alina, review progress, or view recommendations.
4. **Secondary history:** a compact recent-scans section that can open the dedicated History view.

The layout should remain readable on a typical mobile or desktop viewport. There is no need for a separate analytics page in the MVP.

## Look and Feel

The experience should feel calm, trusted, and conversational. It should not resemble a clinical dashboard or a generic AI app.

- Use a modern, approachable visual style with clear hierarchy and generous spacing.
- Prefer warm, neutral colors and a restrained accent color that communicates progress without appearing medical or alarming.
- Use plain-language labels such as “Your skin today,” “Your skin journey,” and “What’s next?”
- Display skin scores and trend indicators as supporting evidence, not as the main message.
- Use small, consistent visual indicators to show direction, such as improving, stable, or needing attention.
- Avoid dense tables, detailed numerical charts, and diagnostic language in the first screen.
- Avoid making the user feel that the product is failing when the skin is not perfect. Emphasize progress, context, and useful next steps.

## Features and Behavior

### Home Screen and Current Understanding

The home screen begins with a personalized greeting, such as “Good evening, Sarah 👋”. It then presents the current skin summary as the center of attention.

The current summary must:

- Explain what has changed in plain language.
- Identify the strongest improvement or concern when one is present.
- Distinguish current observations from conclusions about long-term causes.
- Avoid making medical, diagnostic, or treatment claims.
- Use the user’s most recent completed scan as the current evidence.

Example behavior:

> “Your skin today: Hydration has improved by 8% since your last scan. Texture is stable, but oiliness increased slightly compared with your previous check.”

The summary should be concise enough to understand within a few seconds. It may include a short supporting explanation when the result is unclear.

### Current Skin Score and Supporting Trends

The home screen shows a compact skin score and a small set of trend indicators beneath the summary. These elements support the AI explanation rather than compete with it.

The score and trend indicators must:

- Use the latest available scan as the current point.
- Show directional changes where a comparison is available.
- Avoid implying that a score is a diagnosis or a measure of overall health.
- Show only the attributes needed to explain the current summary, such as hydration, texture, pores, and oiliness.
- Display “No comparison yet” when there is not enough history.

The user should be able to understand whether the skin is improving, stable, or declining from the home screen without opening a report.

### Recent Scans Timeline

The home screen displays a compact “Recent Scans” timeline containing the latest available scans. The timeline should show enough context to answer whether the skin is improving without becoming a spreadsheet.

Each timeline item must show:

- The scan date or relative time.
- The skin score when available.
- Directional changes for the most important attributes.
- A clear action to open the scan for deeper analysis.

For example:

- Today — Skin score 84; Hydration ↑; Texture ↑
- 7 days ago — Skin score 79
- 30 days ago — Skin score 75

The timeline must not force users to review old data. It is secondary to the current summary and should remain available as a compact preview.

A dedicated History view provides the complete scan timeline, detailed attribute comparisons, and deeper analysis. The History view is accessible from the home screen and from the conversation experience.

### First-Use Experience

When the user has no scan history, the home screen must not display an empty dashboard or imply that data is missing.

The first screen should:

- Welcome the user to Alina.
- Explain that the first scan creates a personal skin baseline.
- Describe how the baseline will be used over time.
- Preview the value the user will receive after scanning.
- Present a clear primary action: “Start Your First Skin Scan.”
- Explain that the scan is the beginning of a personal skincare journey rather than a one-time analysis.

Example copy:

> “Your first scan creates your personal skin baseline. It helps Alina understand your current skin condition, track changes over time, and give you recommendations that become more accurate as your journey continues.”

The preview should list the future value of the first scan:

- Current skin condition
- Areas that are improving or need attention
- Progress over time
- Personalized routines and product recommendations

### Scan Preparation Guidance

Before the scan starts, Alina should give the user a short, actionable preparation message. It should identify the most important capture conditions without overwhelming the user.

The preparation guidance must include:

- Natural lighting
- Face visible to the camera
- Nothing covering the skin
- Looking directly at the camera

The user may proceed directly to capture or return to the guidance before starting. The preparation screen must not ask the user to complete a lengthy setup process.

### Scan Failure and Retry

If the camera cannot capture a valid frame, Alina must identify one specific issue and explain how to correct it.

The failure experience must:

- State why the scan could not be completed.
- Give one concise action for the user to correct the issue.
- Provide a clear “Try Again” action.
- Preserve the user’s current screen so they can retry without starting over.
- Avoid showing a generic error message or a long troubleshooting list.

Examples include:

- “The face was not visible. Keep your face inside the frame and try again.”
- “The image was too dark. Move to a well-lit location and try again.”
- “The image was not clear enough. Hold still and try again.”

### Conversation and Historical Comparison

The user can ask Alina questions about the current scan, recent changes, routines, or recommendations. Alina must retrieve the relevant stored history and answer in plain language.

Examples include:

- “Has my skin improved since last week?”
- “When was my skin healthiest?”
- “What changed after my vacation?”
- “Why did my oiliness increase?”
- “Should I change my routine?”

Alina must not claim that a conclusion is certain when the available history is insufficient. It should state what is known, what is not known, and what additional scans would clarify.

### Recommendation Experience

The user receives a simple routine and one primary product recommendation based on the current scan and available user preferences. Alina must explain the recommendation in terms of the current skin condition, not as a claim based on long-term history.

Qloo is required for the MVP recommendation path. Alina must use Qloo’s product data and the user’s stated preferences, brand affinity, budget, and ingredient preferences to choose among compatible products. The local curated catalog remains a controlled fallback only when Qloo cannot be queried safely, and a recommendation cannot be treated as complete while Qloo is unavailable.

A recommendation must include:

- The primary product or routine recommendation.
- A short explanation of why it matches the current analysis.
- The degree of confidence or limitation when history is limited.
- A small set of alternatives when useful.
- An option to add the product to the routine or begin a PayPal checkout request.

The recommendation must never claim to be the best product for the user without explaining the evidence and limitations.

### Confidence and Scan Milestones

Alina must be honest about what it knows and what it does not know.

- After one scan, Alina may provide a current snapshot and general guidance, but must not claim that long-term trends are established.
- After two scans, Alina may describe limited differences between the two observations, but should still avoid overconfident trend conclusions.
- After four scans, Alina may begin presenting trend-based insight and more personalized recommendations.
- The four-scan milestone is a progress cue, not a requirement or a penalty.

When the user has completed one or two scans, Alina should say that the system is still learning and provide a message such as:

> “Based on today’s scan, your skin appears slightly dehydrated. It’s still early in your skincare journey, so this is an initial recommendation. As you complete more scans, I’ll learn how your skin changes over time and provide more personalized advice.”

When the user has completed one scan, Alina should display the progress message:

> “You’ve completed 1 of 4 scans needed to start identifying trends. Continue scanning every few days to unlock progress tracking, personalized insights, and smarter recommendations.”

When the user has completed two scans, the same milestone should update to “2 of 4 scans.”

### Quick Actions

The home screen includes a small set of quick actions near the bottom. The most relevant action must depend on the user’s state.

The quick actions are:

- **Scan Again** — starts a new capture.
- **Ask Alina** — opens the conversational assistant.
- **View Progress** — opens the current trend summary or History view.
- **See Recommendations** — opens the current product and routine recommendations.

When the user has not scanned recently, the primary action should be “Scan Again” and the home screen should explain the value of updating the journey.

When the user has already scanned today, the primary action should be “Ask Alina” and the home screen should explain that the scan is complete.

### Conversation State and Persistence

The user’s conversation history and scan history must remain available between sessions. The product should remember the most recent scan, relevant prior scans, and earlier user questions when those records are available.

Alina should explain when it is using current evidence, previous scans, or user preferences. It should not imply that it remembers information that is unavailable or not yet stored.

## States and Boundaries

- **First use:** welcome, baseline explanation, scan preparation, and first scan.
- **First scan complete:** baseline introduced, current summary shown, and the four-scan progress cue appears.
- **One or two scans:** current snapshot and general guidance, with limited trend claims.
- **Three or four scans:** richer comparison and trend-based guidance, without overclaiming certainty.
- **Scan in progress:** the user sees capture guidance and status, not an empty or incomplete dashboard.
- **Scan failed:** one actionable correction and a retry option.
- **Current scan complete:** the user can ask Alina, view progress, or review recommendations.
- **History available:** the user can open the dedicated History view and inspect older scans.
- **No available data:** Alina explains that the current result is a baseline and provides a clear path to scan again.
- **Payment requested:** the user receives a clear confirmation step and no payment is completed automatically.

## Product Decisions

- The home screen is assistant-first rather than analytics-first.
- The current plain-language summary is the primary content.
- The skin score and compact trend indicators are supporting evidence.
- The latest scans appear in a compact timeline, with a dedicated History view for deeper analysis.
- The scan flow uses a simulated or test camera source in the MVP, while real YouCam results remain the analysis source.
- Qloo is required for the MVP recommendation path and is the primary product-data source.
- The curated catalog is a controlled fallback only when Qloo is unavailable, unauthenticated, or returns unusable data.
- The user receives one primary recommendation and a small set of alternatives.
- The four-scan milestone is a progress guide rather than a requirement.
- Recommendations are grounded in current scan evidence and are explicitly limited when history is insufficient.
- A scan failure identifies one issue and offers one retry action.
- The user must explicitly approve any PayPal checkout request.

## What We're Building

The complete MVP must provide:

- A first-use experience that introduces the personal skin journey.
- Camera capture and OpenCV validation.
- A real YouCam skin-analysis request.
- A current summary and compact recent-scan timeline.
- A dedicated History view with detailed comparisons.
- Conversation-based answers about current and historical results.
- Current-scan recommendations with transparent confidence limits.
- A small preference profile and curated product catalog.
- Required Qloo personalization for the normal recommendation path, with a controlled local fallback.
- Add-to-routine and PayPal confirmation flows.
- Scan retry and scan-completion states.
- A four-scan progress milestone that encourages continued use.

## Deferred From the POC

- Live Ring or other proprietary camera integration.
- Real-time Alexa+ integration.
- Full payment completion and production commerce infrastructure.
- Proactive reminders and notifications.
- Multiple users, household profiles, and sharing.
- Medical or clinical claims, diagnosis, or treatment advice.
- General-purpose wellness tools outside skincare.

## Possible Later Enhancements

- Add nutrition, wearable, weather, calendar, and other wellness tools as agent capabilities.
- Add recurring reminders and personalized progress prompts.
- Add household profiles and shared skin journeys.
- Add richer recommendation explanations and product comparisons.
- Add a reusable agent tool registry for future wellness domains.

## Non-Goals

- This product will not diagnose skin conditions or provide medical advice.
- This product will not use a single scan to claim a long-term skin trend.
- This product will not present scores as the sole or complete understanding of the user’s skin.
- This product will not automatically purchase products.
- This product will not provide a complete analytics dashboard or an exhaustive historical report in the first screen.
- This product will not claim that a local catalog fallback is equivalent to live Qloo recommendations.
- This product will not begin a recommendation flow without a usable Qloo response, except when the controlled fallback is explicitly active.

## Open Questions

- **Must be answered before 4-spec:** The minimum supported YouCam API response fields and validation rules.
- **Must be answered before 4-spec:** The exact user-preference fields available for the local recommendation profile.
- **Must be answered before 4-spec:** The product catalog shape, number of recommendations, and Qloo access contract available in the MVP.
- **Must be answered before 4-spec:** Qloo credentials, authorization, rate limits, response schema, and availability for the learner’s build environment.
- **Can wait until build:** The exact visual color palette, typography, and icon style.
- **Can wait until build:** The final scope of the dedicated History view’s charting controls.
