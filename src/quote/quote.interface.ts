export interface OfframpQuoteResponseDto {
  minAmount: string;
  maxAmount: string;
  arrivalTimeMessage: string;
  provider: any;
  error?: string;
  quotePayload: string;
  quoteSignature: string;
}
