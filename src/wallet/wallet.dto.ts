import { IsNotEmpty, IsString } from "class-validator";

export class SetDefaultWalletDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;
}
