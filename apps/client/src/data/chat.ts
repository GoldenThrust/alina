export const CHAT_PAGE_SIZE = 20;

export interface MessagePage {
  messages: Message[];
  /** Opaque cursor for the next older page, or null at the start of the conversation. */
  nextCursor: string | null;
}

/* ---------- Dummy messages (remove once the API is wired up) ---------- */

const USER_LINES = [
  "What changed in my last check-in?",
  "Why does consistency matter?",
  "What should I keep simple?",
];
const ALINA_LINES = [
  "Your sample check-ins show hydration moving in a steadier direction.",
  "Comparing scans under similar conditions makes trends more reliable.",
  "A short routine you can repeat beats a long one you skip.",
];

const TOTAL = 88; // 4.4 pages, so the last page is partial

// Oldest first. The mock cursor is simply an index into this array.
export const MOCK_MESSAGES: Message[] = Array.from({ length: TOTAL }, (_, i): Message => {
  const fromUser = i % 2 === 0;
  const lines = fromUser ? USER_LINES : ALINA_LINES;
  return {
    id: `message-${i + 1}`,
    userId: "user-1",
    sender: fromUser ? "USER" : "ALINA", // adjust if your sender union names Alina differently
    content: `${lines[Math.floor(i / 2) % lines.length]} (#${i + 1})`,
    createdAt: new Date(Date.now() - (TOTAL - i) * 5 * 60_000),
  };
});

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/* ---------- "Backend" ---------- */

/** Returns the newest page when `before` is omitted, otherwise the page older than `before`. */
export async function fetchMessages(
  options: { before?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<MessagePage> {
  const { before, limit = CHAT_PAGE_SIZE, signal } = options;

  // Swap this body for the real request:
  //   const params = new URLSearchParams({ limit: String(limit) });
  //   if (before) params.set("before", before);
  //   const res = await fetch(`/api/messages?${params}`, { signal });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   const page = (await res.json()) as MessagePage;
  //   return { ...page, messages: page.messages.map((m) => ({ ...m, createdAt: new Date(m.createdAt) })) };
  await wait(500, signal);

  const end = before ? Number(before) : MOCK_MESSAGES.length;
  const start = Math.max(0, end - limit);
  return {
    messages: MOCK_MESSAGES.slice(start, end),
    nextCursor: start > 0 ? String(start) : null,
  };
}

export async function sendMessage(
  options: { userId: string; content: string; signal?: AbortSignal },
): Promise<{ message: Message; reply: Message }> {
  const { userId, content, signal } = options;

  // Swap this body for the real request (POST /api/messages returning the saved
  // user message and Alina's reply).
  await wait(1200, signal);

  const createdAt = new Date();
  return {
    message: {
      id: `message-${crypto.randomUUID()}`,
      userId,
      sender: "USER",
      content,
      createdAt,
    },
    reply: {
      id: `message-${crypto.randomUUID()}`,
      userId,
      sender: "ALINA",
      content:
        "This sample assistant is not connected yet. In the completed build, Alina will answer using your saved scan evidence.",
      createdAt: new Date(createdAt.getTime() + 1),
    },
  };
}