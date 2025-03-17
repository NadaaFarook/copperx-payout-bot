import { TransferSessionData } from "src/transfer/transfer.interface";

export enum AuthStep {
  NONE = "none",
  WAITING_FOR_EMAIL = "waiting_for_email",
  WAITING_FOR_OTP = "waiting_for_otp",
  AUTHENTICATED = "authenticated",
}

export interface UserSession {
  step: AuthStep;
  email?: string;
  accessToken?: string;
  sid?: string;
  expireAt?: string;
  lastActivity: Date;
  organizationId?: string;
  notificationsEnabled?: boolean;
  transferSession?: TransferSessionData;
}

export interface SessionData {
  [userId: number]: UserSession;
}
