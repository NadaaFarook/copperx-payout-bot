import { UserProfileTypeEnum, UserRoleEnum, UserStatusEnum } from "./auth.enum";

export interface AuthUserInterface {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage: string;
  organizationId: string;
  role: UserRoleEnum;
  status: UserStatusEnum;
  type: UserProfileTypeEnum;
  relayerAddress: string;
  flags: string[];
  walletAddress: string;
  walletId: string;
  walletAccountType: string;
}

export interface AuthenticateResponseInterface {
  schema: string;
  accessToken: string;
  accessTokenId: string;
  expireAt: string;
  user: AuthUserInterface;
}

export interface LoginEmailOtpResponseInterface {
  email: string;
  sid: string;
}
