type Gender = "MALE" | "FEMALE";
type UserRole = "USER" | "ADMIN";
type ScanStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type RoutinePeriod = "MORNING" | "AFTERNOON" | "EVENING" | "NIGHT" | "HABIT";
type RecommendationType = "PRODUCT" | "ROUTINE" | "HABIT";
type Sender = "USER" | "ALINA";
type DeviceType = "RING" | "MOBILE" | "WEB";
type SubscriptionPlan = "FREE" | "PLUS" | "PREMIUM";
type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED";

type ProductCategory =
  | "CLEANSER"
  | "TONER"
  | "SERUM"
  | "MOISTURIZER"
  | "SUNSCREEN"
  | "TREATMENT"
  | "OTHER";

interface HasId {
  id: string;
}

interface Entities<T extends HasId> {
  byId: Record<string, T>;
  ids: string[];
}

interface AuthState {
  user: User | null;
  session: Session | null;
  authReady: boolean;

  setAuthReady: () => void;

  signIn: (user: User, session: Session) => void;
  setUser: (user: User) => void;
  patchUser: (patch: Partial<Omit<User, "id">>) => void;
  setSession: (session: Session) => void;
  signOut: () => void;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  emailVerifiedAt: Date | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  avatar: string | null;
  skinType: string | null;
  skinTone: string | null;
  lastScanImage: string | null;
  lastInteractionId: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface RegionScores {
  score: number;
  [region: string]: number;
}

interface PoreScores {
  forehead: number;
  nose: number;
  cheek: number;
  whole: number;
}

interface WrinkleScores {
  forehead: number;
  glabellar: number;
  crowfeet: number;
  periocular: number;
  nasolabial: number;
  marionette: number;
  whole: number;
}

interface ZoneTypes {
  whole: string;
  t_zone: string;
  u_zone: string;
}


interface SkinAnalysis {
  id?: string;
  scanId?: string;
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
  texture: number | null;
  acne: number | null;
  pore: PoreScores | null;
  wrinkle: WrinkleScores | null;
  tearTrough: number | null;
  skinType?: {
    whole: string;
    t_zone: string;
    u_zone: string;
  } | null;
}

interface SkinScan {
  id: string;
  userId: string;
  status: ScanStatus;
  score: number | null;
  skinAge: number | null;
  skinType: ZoneTypes | null;
  aiSummary: string | null;
  aiShortSummary: string | null;
  aiObservation: string | null;
  aiShortObservation: string | null;
  image: string | null;
  createdAt: Date;
  analysis: SkinAnalysis | null;
}

interface RoutineStep {
  id: string;
  routineId: string;
  period: RoutinePeriod;
  title: string;
  instruction: string;
  position: number;
}

interface Routine {
  id: string;
  userId: string;
  title: string;
  accepted: boolean;
  createdAt: Date;
  steps: RoutineStep[];
  recommendation: Recommendation | null;
}

interface RoutineLog {
  id: string;
  userId: string;
  routineId: string;
  createdAt: Date;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  image: string | null;
  affiliateUrl: string | null;
  price: number | null;
  recommendation?: Recommendation | null;
}

interface Recommendation {
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

interface Message {
  id: string;
  userId: string;
  sender: Sender;
  content: string;
  createdAt: Date;
  pending?: boolean;
  streaming?: boolean;
}

interface Preference {
  id: string;
  userId: string;
  favoriteBrands: string[];
  favoriteIngredients: string[];
  avoidedIngredients: string[];
  budget: number | null;
}

interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  total: number;
  paypalOrderId: string | null;
  createdAt: Date;
  items: OrderItem[];
}

interface ConnectedDevice {
  id: string;
  userId: string;
  type: DeviceType;
  externalId: string;
  name: string;
}

interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date | null;
}

interface RoutineState {
  routines: Entities<Routine>;
  logs: Entities<RoutineLog>;

  setRoutines: (routines: Routine[]) => void;
  upsertRoutine: (routine: Routine) => void;
  removeRoutine: (routineId: string) => void;
  upsertLogs: (logs: RoutineLog[]) => void;
  /** Optimistic accept/decline of a suggested routine. */
  setAccepted: (routineId: string, accepted: boolean) => void;
  upsertStep: (step: RoutineStep) => void;
  removeStep: (routineId: string, stepId: string) => void;

  setLogs: (logs: RoutineLog[]) => void;
  addLog: (log: RoutineLog) => void;
  removeLog: (logId: string) => void;
  clear: () => void;
  setDemoRoutines: () => void;
}
