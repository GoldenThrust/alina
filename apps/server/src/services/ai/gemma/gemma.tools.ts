import { Type } from "@google/genai";

export const gemmaTools = [
  {
    functionDeclarations: [
      {
        name: "queryKnowledge",
        description:
          "Retrieve information from Alina's internal knowledge base including scan history, conversations, routines, recommendations, products, preferences, subscriptions and user profile.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Natural language search query.",
            },
            entity: {
              type: Type.STRING,
              description:
                "Optional entity. Examples: conversation, scan, routine, recommendation, product, subscription.",
            },
            limit: {
              type: Type.INTEGER,
              description: "Maximum number of results.",
            },
          },
          required: ["query"],
        },
      },

      {
        name: "searchWeb",
        description:
          "Search trusted online sources when internal knowledge is insufficient.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
            },
          },
          required: ["query"],
        },
      },

      {
        name: "remember",
        description:
          "Save long-term user preferences or important information.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
            },
            value: {
              type: Type.STRING,
            },
          },
          required: ["category", "value"],
        },
      },

      {
        name: "respond",
        description:
          "Call this ONLY when you have gathered enough information to answer the user.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
            },
          },
          required: ["message"],
        },
      },
    ],
  },
];