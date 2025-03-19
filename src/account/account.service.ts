import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { API_CONSTANTS } from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { BaseHttpService } from "../common/services/base-http.service";
import { AccountDto, AccountsResponseDto } from "./account.interface";
import { TransferAccountType } from "./account.interface";

@Injectable()
export class AccountService extends BaseHttpService {
  protected readonly logger = new Logger(AccountService.name);
  protected readonly baseUrl = API_CONSTANTS.BASE_URL;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {
    super(httpService, tokenInterceptor);
  }

  /**
   * Get all accounts for the authenticated user's organization
   * @param token The authentication token
   * @returns List of accounts
   */
  async getAccounts(token: string): Promise<AccountsResponseDto> {
    this.logger.log("Fetching organization accounts");
    return this.get<AccountsResponseDto>(
      API_CONSTANTS.ACCOUNTS.GET_ACCOUNTS,
      token
    );
  }

  /**
   * Get bank accounts for the authenticated user's organization
   * @param token The authentication token
   * @returns List of bank accounts
   */
  async getBankAccounts(token: string): Promise<AccountDto[]> {
    this.logger.log("Fetching organization bank accounts");
    const accounts = await this.getAccounts(token);

    // Filter only active bank accounts
    return accounts.data.filter((account) => account.type === "bank_account");
  }
}
