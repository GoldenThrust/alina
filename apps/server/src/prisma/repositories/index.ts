import { ConnectedDeviceRepository } from "./connected-device.repository";
import { MessageRepository } from "./message.repository";
import { OAuthAccountRepository } from "./oauth-account.repository";
import { OrderItemRepository } from "./order-item.repository";
import { OrderRepository } from "./order.repository";
import { PreferenceRepository } from "./preference.repository";
import { ProductRepository } from "./product.repository";
import { RecommendationRepository } from "./recommendation.repository";
import { RoutineLogRepository } from "./routine-log.repository";
import { RoutineStepRepository } from "./routine-step.repository";
import { RoutineRepository } from "./routine.repository";
import { SessionRepository } from "./session.repository";
import { SkinAnalysisRepository } from "./skin-analysis.repository";
import { SkinScanRepository } from "./skin-scan.repository";
import { SubscriptionRepository } from "./subscription.repository";
import { UserRepository } from "./user.repository";

const products = new ProductRepository();
const routineSteps = new RoutineStepRepository();
const routines = new RoutineRepository(routineSteps);
const orderItems = new OrderItemRepository();

/** One shared instance of every repository. */
export const repositories = {
  users: new UserRepository(),
  sessions: new SessionRepository(),
  oauthAccounts: new OAuthAccountRepository(),
  scans: new SkinScanRepository(),
  analyses: new SkinAnalysisRepository(),
  routines,
  routineSteps,
  routineLogs: new RoutineLogRepository(),
  products,
  recommendations: new RecommendationRepository(products, routines),
  messages: new MessageRepository(),
  preferences: new PreferenceRepository(),
  orders: new OrderRepository(orderItems, products),
  orderItems,
  devices: new ConnectedDeviceRepository(),
  subscriptions: new SubscriptionRepository(),
};

export type Repositories = typeof repositories;

export * from "./types";
export { BaseRepository } from "./base.repository";
export type { FindOptions } from "./base.repository";
export {
  ConnectedDeviceRepository,
  MessageRepository,
  OAuthAccountRepository,
  OrderItemRepository,
  OrderRepository,
  PreferenceRepository,
  ProductRepository,
  RecommendationRepository,
  RoutineLogRepository,
  RoutineRepository,
  RoutineStepRepository,
  SessionRepository,
  SkinAnalysisRepository,
  SkinScanRepository,
  SubscriptionRepository,
  UserRepository,
};
