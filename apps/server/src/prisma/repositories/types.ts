/**
 * Row types for every model in the schema, plus helpers for create inputs.
 * Dates are typed as Date; if your ORM returns ISO strings for
 * TimestamptzString columns, change them here once.
 */

/* ------------------------------ enums ------------------------------ */

export type Gender = "MALE" | "FEMALE";
export type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type RoutinePeriod =
  | "MORNING"
  | "AFTERNOON"
  | "EVENING"
  | "NIGHT"
  | "HABIT";
export type RecommendationType = "PRODUCT" | "ROUTINE" | "HABIT";
export type Sender = "USER" | "ALINA";
export type DeviceType = "RING" | "MOBILE" | "WEB";
export type SubscriptionPlan = "FREE" | "PLUS" | "PREMIUM";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED";
export type ProductCategory =
  | "CLEANSER"
  | "TONER"
  | "SERUM"
  | "MOISTURIZER"
  | "SUNSCREEN"
  | "TREATMENT"
  | "OTHER";

/* ------------------------------ models ------------------------------ */

export interface User {
  id: string;
  email: string;
  fullName: string;
  password: string | null;
  phoneNumber: string | null;
  emailVerifiedAt: Date | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  createdAt: Date;
  updatedAt: Date;
  avatar: string | null;
  skinType: string | null;
  skinTone: string | null;
  lastScanImage: string | null;
  /** Gemma interaction chain pointer. Add `lastInteractionId String?` to User. */
  lastInteractionId: string | null;
}

export interface Session {
  id: string;
  userId: string;
  refreshSecret: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkinScan {
  id: string;
  userId: string;
  status: ScanStatus;
  score: number | null;
  skinAge: number | null;
  aiSummary: string | null;
  aiShortSummary: string | null;
  aiObservation: string | null;
  aiShortObservation: string | null;
  image: string | null;
  createdAt: Date;
}

export interface SkinAnalysis {
  id: string;
  scanId: string;
  redness: number | null;
  ageSpot: number | null;
  radiance: number | null;
  moisture: number | null;
  oiliness: number | null;
  darkCircle: number | null;
  eyeBag: number | null;
  droopyUpperEyelid: number | null;
  droopyLowerEyelid: number | null;
  firmness: number | null;
  texture: unknown;
  acne: number | null;
  pore: unknown;
  wrinkle: unknown;
  tearTrough: number | null;
  skinType: unknown;
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
}

export interface RoutineStep {
  id: string;
  routineId: string;
  period: RoutinePeriod;
  title: string;
  instruction: string;
  position: number;
}

export interface RoutineLog {
  id: string;
  userId: string;
  routineId: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  image: string | null;
  affiliateUrl: string | null;
  price: number | null;
}

export interface Recommendation {
  id: string;
  userId: string;
  scanId: string | null;
  type: RecommendationType;
  explanation: string;
  accepted: boolean;
  productId: string | null;
  routineId: string | null;
  createdAt: Date;
}

/** One message thread per user. Message carries `userId` directly. */
export interface Message {
  id: string;
  userId: string;
  sender: Sender;
  content: string;
  createdAt: Date;
}

export interface Preference {
  id: string;
  userId: string;
  favoriteBrands: string[];
  favoriteIngredients: string[];
  avoidedIngredients: string[];
  budget: number | null;
}

export interface Order {
  id: string;
  userId: string;
  total: number;
  paypalOrderId: string | null;
  createdAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
}

export interface ConnectedDevice {
  id: string;
  userId: string;
  type: DeviceType;
  externalId: string;
  name: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date | null;
}

/* ------------------------------ create inputs ------------------------------ */

type Auto = "id" | "createdAt" | "updatedAt";

type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

/**
 * Create input for a model: id and timestamps are generated, nullable fields
 * are optional, and `Defaulted` lists fields that have a database default.
 */
export type NewRecord<T, Defaulted extends keyof T = never> = Omit<
  T,
  Auto | Defaulted | NullableKeys<T>
> &
  Partial<Pick<T, Exclude<Defaulted | NullableKeys<T>, Auto>>> &
  // createdAt is optional on models that have it, so seeds and imports can backdate rows.
  (T extends { createdAt: Date } ? { createdAt?: Date } : unknown);

export type NewUser = NewRecord<User>;
export type NewSession = NewRecord<Session>;
export type NewOAuthAccount = NewRecord<OAuthAccount>;
export type NewSkinScan = NewRecord<SkinScan>;
export type NewSkinAnalysis = NewRecord<SkinAnalysis>;
export type NewRoutine = NewRecord<Routine>;
export type NewRoutineStep = NewRecord<RoutineStep>;
export type NewRoutineLog = NewRecord<RoutineLog>;
export type NewProduct = NewRecord<Product>;
export type NewRecommendation = NewRecord<Recommendation>;
export type NewMessage = NewRecord<Message>;
export type NewPreference = NewRecord<
  Preference,
  "favoriteBrands" | "favoriteIngredients" | "avoidedIngredients"
>;
export type NewOrder = NewRecord<Order>;
export type NewOrderItem = NewRecord<OrderItem>;
export type NewConnectedDevice = NewRecord<ConnectedDevice>;
export type NewSubscription = NewRecord<Subscription>;

export interface StepInput {
  period: RoutinePeriod;
  title: string;
  instruction: string;
}
