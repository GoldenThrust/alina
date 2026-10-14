import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const weatherTool = {
  type: 'function',
  name: 'get_weather',
  description: 'Gets the weather for a given location.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA',
      },
    },
    required: ['location'],
  },
};

const tools = [
  { type: 'google_search' }, // Built-in tool
  weatherTool,
];

const interaction = await client.interactions.create({
  model: "gemma-4-31b-it",
  input: "What is the northernmost city in the United States? What's the weather like there today? and also search for the latest top rating anime in Japan",
  tools: tools,
});

console.log("First interaction:");
console.log(interaction);
console.log(interaction.output_text);

for (const step of interaction.steps) {
  console.log(`\n--- Step ${step.index}: ${step.type} ---`);
  console.log("step details:", step);
  if (step.type === 'google_search_call') {
    console.log(`Search ID: ${step.id}`);
    console.log(`Queries: ${JSON.stringify(step.arguments?.queries)}`);
  }
  if (step.type === 'function_call') {
    console.log(`Function call: ${step.name} (ID: ${step.id})`);
    const result = { response: 'Very cold. 22 degrees Fahrenheit.' };
    const interaction_2 = await client.interactions.create({
      model: "gemma-4-31b-it",
      previous_interaction_id: interaction.id,
      tools: tools,
      input: [
        {
          type: 'function_result',
          name: step.name,
          call_id: step.id,
          result: [{ type: 'text', text: JSON.stringify(result) }],
        },
      ],
    });

    console.log("Second interaction:");
    console.log(interaction_2);

    console.log(interaction_2.output_text);
  }
}