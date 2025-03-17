import { IsNotEmpty, IsString, Length } from "class-validator";
import { Country } from "./quote.enum";

export class PublicOfframpQuoteRequestDto {
  @IsString()
  @IsNotEmpty()
  sourceCountry: Country;

  @IsString()
  @IsNotEmpty()
  destinationCountry: string;

  @IsString()
  @Length(100000000)
  @IsNotEmpty()
  amount: string;
}
