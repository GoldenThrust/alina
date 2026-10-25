import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});
const MODEL = "gemma-4-31b-it"; // Gemini 3+/4 support built-in + custom tool combos (Preview)

// If the API rejects a follow-up because the log_event call has no matching
// function_result, set this to true to send a tiny ack for it as well.
const ACK_FIRE_AND_FORGET = false;

// ---------------------------------------------------------------------------
// 1. Tool declarations: one built-in + three custom functions
// ---------------------------------------------------------------------------
const TOOLS = [
  { type: "google_search" }, // built-in, runs server-side, no handling needed
  {
    type: "function",
    name: "get_weather",
    description: "Get the current weather for a city.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City, e.g. Abuja, Nigeria" },
      },
      required: ["city"],
    },
  },
  {
    type: "function",
    name: "convert_currency",
    description: "Convert an amount between two currencies.",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number" },
        from_currency: { type: "string", description: "ISO code, e.g. USD" },
        to_currency: { type: "string", description: "ISO code, e.g. NGN" },
      },
      required: ["amount", "from_currency", "to_currency"],
    },
  },
  {
    type: "function",
    name: "log_event",
    description:
      "Record that something happened in the user's session (audit/analytics). " +
      "Call it whenever you finish answering a question. Returns nothing useful.",
    parameters: {
      type: "object",
      properties: {
        event: { type: "string" },
        details: { type: "string" },
      },
      required: ["event"],
    },
  },
];

// ---------------------------------------------------------------------------
// 2. Local implementations (mocked)
// ---------------------------------------------------------------------------
const returnsResult = {
  get_weather: ({ city }) => ({ city, temperature_c: 31, condition: "Partly cloudy" }),
  convert_currency: ({ amount, from_currency, to_currency }) => {
    const rate = 1500; // mock
    return { amount, from: from_currency, to: to_currency, converted: amount * rate, rate };
  },
};

const eventLog = [];
const fireAndForget = {
  log_event: ({ event, details = "" }) => {
    eventLog.push({ event, details });
    console.log(`\n[log_event executed locally] ${event} | ${details}`);
  },
};

/** Runs a function. Returns a function_result input item, or null if the
 *  result should NOT be sent back to Gemini. */
function dispatch(name, callId, args) {
  if (returnsResult[name]) {
    const result = returnsResult[name](args);
    return {
      type: "function_result",
      name,
      call_id: callId, // must match the function_call step's id
      result: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
  if (fireAndForget[name]) {
    fireAndForget[name](args);
    return ACK_FIRE_AND_FORGET
      ? { type: "function_result", name, call_id: callId, result: [{ type: "text", text: '{"ok": true}' }] }
      : null;
  }
  throw new Error(`Unknown function: ${name}`);
}

// ---------------------------------------------------------------------------
// 3a. Non-streaming loop (stateful via previous_interaction_id)
// ---------------------------------------------------------------------------
async function runTurn(userText, previousId = null) {
  let input = userText;
  let prev = previousId;
  while (true) {
    const interaction = await ai.interactions.create({
      model: MODEL,
      input,
      tools: TOOLS, // resend tools each request (the docs' REST examples do)
      previous_interaction_id: prev,
      generation_config: {
        tool_choice: "auto"
      }
    });

    console.log(`\n--- Interaction ${interaction.id} (status: ${interaction.status}) ---`);
    console.log(interaction);

    const calls = interaction.steps.filter((s) => s.type === "function_call");
    if (calls.length === 0) return { text: interaction.output_text, id: interaction.id };

    const results = calls
      .map((c) => dispatch(c.name, c.id, c.arguments))
      .filter(Boolean);
    if (results.length === 0) return { text: interaction.output_text, id: interaction.id };

    input = results; // status was "requires_action"
    prev = interaction.id;
  }
}

// ---------------------------------------------------------------------------
// 3b. Streaming loop (stream: true)
// ---------------------------------------------------------------------------
async function streamOnce(input, prev) {
  const stream = await ai.interactions.create({
    model: MODEL,
    input,
    tools: TOOLS,
    previous_interaction_id: prev,
    stream: true,
    generation_config: {
      tool_choice: "auto"
    }
  });

  console.log(`\n--- Streaming interaction (previous: ${prev}) ---`);

  let interactionId = prev;
  let status = null;
  const calls = new Map(); // step index -> { id, name, args }

  for await (const event of stream) {
    console.log(`\n[stream event] ${event.event_type}`);
    switch (event.event_type) {
      case "interaction.created":
        interactionId = event.interaction.id;
        break;

      case "step.start":
        if (event.step.type === "function_call") {
          calls.set(event.index, { id: event.step.id, name: event.step.name, args: "" });
          console.log(`\n[function_call started] ${event.index} ${event.step.name} (ID: ${event.step.id})`);
        }
        break;

      case "step.delta": {
        const d = event.delta;
        if (d.type === "text") {
          process.stdout.write(d.text);
          console.log(`\n[step text delta] ${event.index} | ${d.text}`);
        } else if (d.type === "arguments_delta") {
          // arguments arrive as partial JSON strings: accumulate per step index
          calls.get(event.index).args += d.arguments;
          console.log(`\n[function_call arguments delta] ${event.index} | ${d.arguments}`);
        } else if (d.type === "google_search_call") {
          console.log(`\n[searching: ${JSON.stringify(d.arguments?.queries)}]`);
        } else if (d.type === "google_search_result") {
          console.log(`\n[search result] ${JSON.stringify(d.result)}`);
        }
        break;
      }

      case "interaction.completed":
        status = event.interaction.status; // "completed" or "requires_action"
        break;

      case "error":
        throw new Error(JSON.stringify(event));

      default:
        break; // unknown event types: ignore (new ones may be added)
    }
  }
  return { interactionId, status, calls: [...calls.values()] };
}

async function runTurnStreaming(userText, previousId = null) {
  let input = userText;
  let prev = previousId;
  while (true) {
    const { interactionId, status, calls } = await streamOnce(input, prev);
    if (status !== "requires_action" || calls.length === 0) return interactionId;

    const results = calls
      .map((c) => dispatch(c.name, c.id, c.args ? JSON.parse(c.args) : {}))
      .filter(Boolean);
    if (results.length === 0) return interactionId;

    input = results; // resumes the stream with the results
    prev = interactionId;
  }
}

// ---------------------------------------------------------------------------
const question =
{
  input: "Search for the northernmost city in the US, tell me the weather there, " +
    "and convert 100 USD to NGN. Log what you did when finished.", additional_instructions: "Please provide detailed reasoning for each step.",
  note: "This is just a test request you don't have to do complex reasoning, just return the results of the function calls."
};
const followUp = "Now do the same weather check for Abuja.";

if (process.argv.includes("--stream")) {
  const lastId = await runTurnStreaming(JSON.stringify(question));
  console.log("\n\n--- follow-up (stateful, nothing re-sent) ---");
  await runTurnStreaming(followUp, lastId);
  console.log();
} else {
  const first = await runTurn(JSON.stringify(question));
  console.log(first.text);
  console.log("\n--- follow-up (stateful, nothing re-sent) ---");
  const second = await runTurn(followUp, first.id);
  console.log(second.text);
}
