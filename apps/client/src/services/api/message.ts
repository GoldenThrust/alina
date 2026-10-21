import { stringToDate } from "../../stores";
import { get } from "./api";

type MessagePage = {
    items: Message[]
    nextCursor: string | null;
}

export async function fetchMessages(options: { cursor?: string; limit?: number; signal?: AbortSignal } = {}) {
    const data = await get<MessagePage>(`/messages`, options);

    return {
        ...data,
        messages: stringToDate<Message[]>(data.items),
    };
}