 
type ID = string;
type ISODate = string;
 
type PaginationParams = {
  page?: number;
  limit?: number;
};
 
type Paginated<T> = {
  data: T[];
  page?: number;
  limit?: number;
  total?: number;
};
 
type MessageResponse = {
  message?: string;
  error?: string;
};
 
/* =====================================================================
 * Enums (mirror prisma enums)
 * ===================================================================== */
 
type Gender = "MALE" | "FEMALE";
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
type UserRole = "USER" | "ADMIN";
 
 
/* =====================================================================
 * Request payloads / query params
 * ===================================================================== */
 
type ListScansParams = PaginationParams & { status?: ScanStatus };
 
type UpsertAnalysisBody = Partial<Omit<SkinAnalysis, "id" | "scanId">>;
 
type CreateOrderBody = {
  items: { productId: ID; quantity: number }[];
  total?: number;
  paypalOrderId?: string;
};
type UpdateOrderBody = Partial<CreateOrderBody>;
 
type CreateDeviceBody = Pick<ConnectedDevice, "type" | "externalId" | "name">;
type UpdateDeviceBody = Partial<CreateDeviceBody>;
 
type CreateMessageBody = { content: string; sender?: Sender };
 
type ListProductsParams = PaginationParams & {
  q?: string;
  category?: ProductCategory;
  brand?: string;
};
type CreateProductBody = Omit<Product, "id">;
type UpdateProductBody = Partial<CreateProductBody>;
 
type CreateRoutineBody = {
  title: string;
  accepted?: boolean;
  steps?: Omit<RoutineStep, "id" | "routineId">[];
};
type UpdateRoutineBody = Partial<Omit<CreateRoutineBody, "steps">>;
 
type CreateStepBody = Omit<RoutineStep, "id" | "routineId">;
type UpdateStepBody = Partial<CreateStepBody>;
 
type ListRoutineLogsParams = PaginationParams & {
  routineId?: ID;
  from?: ISODate;
  to?: ISODate;
};
type CreateRoutineLogBody = { routineId: ID; completedAt: ISODate };
type UpdateRoutineLogBody = Partial<Pick<CreateRoutineLogBody, "completedAt">>;
 
type UpsertPreferenceBody = Partial<
  Pick<Preference, "favoriteBrands" | "favoriteIngredients" | "avoidedIngredients" | "budget">
>;
 
type ListRecommendationsParams = PaginationParams & {
  scanId?: ID;
  type?: RecommendationType;
  accepted?: boolean;
};
type CreateRecommendationBody = {
  type: RecommendationType;
  explanation: string;
  scanId?: ID;
  productId?: ID;
  routineId?: ID;
  accepted?: boolean;
};
type UpdateRecommendationBody = Partial<CreateRecommendationBody>;
 
type Status = "loading" | "ready" | "saving" | "loadError" | "saveError";
