import { createOwnedHandlers } from "../../lib/crud";
import * as S from "./devices.service";

export const deviceController = createOwnedHandlers(S.deviceService, "device");