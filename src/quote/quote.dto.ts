import { IsBoolean, IsNotEmpty, IsString, Length } from "class-validator";
import { Currency } from "src/transfer/transfer.enum";

export class PublicOfframpQuoteRequestDto {
  @IsString()
  @IsNotEmpty()
  sourceCountry: string;

  @IsString()
  @IsNotEmpty()
  destinationCountry: string;

  @IsString()
  @Length(100000000)
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  currency: Currency;

  @IsString()
  preferredBankAccountId?: string;
}
