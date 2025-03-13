import {
  UserProfileTypeEnum,
  UserRoleEnum,
  UserStatusEnum,
} from "../auth.enum";

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
