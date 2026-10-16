type JwtPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
  sessionId?: string;
  secret?: string;
};
 
type OAuthProfile = {
  email: string;
  name: string;
  providerId: string;
  provider: "google" | "X" | "facebook";
};
