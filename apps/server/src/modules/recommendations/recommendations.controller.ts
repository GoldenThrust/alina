import { createOwnedHandlers, getUserId, handle } from "../../lib/crud";
import * as S from "./recommendations.service"

export const recommendationController =  {
    ...createOwnedHandlers(S.recommendationService, "recommendation", ["product"]),
}

