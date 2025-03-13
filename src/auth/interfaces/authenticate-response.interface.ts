import { AuthUserInterface } from "./auth.interface";

export interface AuthenticateResponseInterface {
  schema: string;
  accessToken: string;
  accessTokenId: string;
  expireAt: string;
  user: AuthUserInterface;
}
