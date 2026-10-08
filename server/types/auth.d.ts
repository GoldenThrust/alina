type JwtPayload = {
  sub: string;
  email: string;
  role: "customer" | "admin" | "restaurant_ownerchef" | "delivery_person" | "staff";
  sessionId?: string;
  secret?: string;
};
 
type OAuthProfile = {
  email: string;
  name: string;
  providerId: string;
  provider: "google" | "X" | "facebook";
};
