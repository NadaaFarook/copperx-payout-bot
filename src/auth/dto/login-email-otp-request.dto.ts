import { IsEmail, IsNotEmpty } from "class-validator";

export class LoginEmailOtpRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
