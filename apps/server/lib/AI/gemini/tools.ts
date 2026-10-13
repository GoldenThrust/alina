// gemini/tools.ts
import { Type } from "@google/genai";

export const respondToMessageTool = {
  name: "respondToMessage",
  description:
    "Send a chat message to the room, optionally directed at a specific player, with a realistic typing delay.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: "The exact text to send to the chat.",
      },
      targetPlayerId: {
        type: Type.STRING,
        description:
          "Optional id of the player you are replying to. Omit for a general message to the room.",
      },
      typingDelayMs: {
        type: Type.NUMBER,
        description:
          "Milliseconds to wait before this message appears, simulating human typing/thinking time. Typically 800-4000. 0 to choose not to respond at all.",
      },
    },
    required: ["message", "typingDelayMs"],
  },
};

export const voteAgainstTool = {
  name: "voteAgainst",
  description:
    "Cast your vote against a player.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetPlayerId: {
        type: Type.STRING,
        description: "The id of the player you are voting against.",
      },
      // castVote: {
      //   type: Type.BOOLEAN,
      //   description:
      //     "True to cast your vote against the target player, false to abstain.",
      // },
      publicReason: {
        type: Type.STRING,
        description:
          "A short human-sounding justification you would say out loud for this vote.",
      },
    },
    required: ["targetPlayerId", "publicReason"],
  },
};

export const eyefoldTools = [respondToMessageTool];
export const nightfallTools = [respondToMessageTool, voteAgainstTool];
