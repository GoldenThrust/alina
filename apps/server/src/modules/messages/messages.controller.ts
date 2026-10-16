import { createOwnedHandlers } from "../../lib/crud";
import * as S from "./messages.service";

export const messageController = createOwnedHandlers(S.messageService, "message");