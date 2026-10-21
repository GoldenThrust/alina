import { stringToDate } from "../../stores";
import { get } from "./api";

type MessagePage = {
    items: Message[]
    nextCursor: string | null;
}
export async function fetchMessages(options: { signal?: AbortSignal } = {}): Promise<MessagePage> {
    const data = await get<MessagePage>(`/messages`, options);

    return {
        ...data,
        items: stringToDate<Message[]>(data.items),
    };
}