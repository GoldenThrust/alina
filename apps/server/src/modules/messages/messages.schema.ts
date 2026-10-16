import { z } from "zod";


/* ---------- Message (client can only send as USER) ---------- */
export const CreateMessageBody = z.object({ content: z.string().min(1).max(4000) });
