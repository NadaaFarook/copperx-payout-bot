import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { API_CONSTANTS } from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { BaseHttpService } from "../common/services/base-http.service";
import { PublicOfframpQuoteRequestDto } from "./quote.dto";
import { OfframpQuoteResponseDto } from "./quote.interface";

@Injectable()
export class QuoteService extends BaseHttpService {
  protected readonly logger = new Logger(QuoteService.name);
  protected readonly baseUrl = API_CONSTANTS.BASE_URL;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {
    super(httpService, tokenInterceptor);
  }

  /**
   * Get public offramp quote for bank withdrawals
   * @param token The authentication token
   * @param dto The quote request DTO
   * @returns Quote information
   */
  async getPublicOfframpQuote(
    token: string,
    dto: PublicOfframpQuoteRequestDto
  ): Promise<OfframpQuoteResponseDto> {
    this.logger.log(`Requesting offramp quote for amount ${dto.amount}`);

    return this.post<OfframpQuoteResponseDto>(
      API_CONSTANTS.QUOTES.OFFRAMP,
      dto,
      token
    );
  }
}
