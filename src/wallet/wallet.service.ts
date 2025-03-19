import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { API_CONSTANTS } from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { BaseHttpService } from "../common/services/base-http.service";
import { WalletDto, WalletBalanceDto } from "./wallet.interface";
import { SetDefaultWalletDto } from "./wallet.dto";

@Injectable()
export class WalletService extends BaseHttpService {
  protected readonly logger = new Logger(WalletService.name);
  protected readonly baseUrl = API_CONSTANTS.BASE_URL;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {
    super(httpService, tokenInterceptor);
  }

  /**
   * Get all wallets for the authenticated user's organization
   * @param token The authentication token
   * @returns List of wallets
   */
  async getWallets(token: string): Promise<WalletDto[]> {
    this.logger.log("Fetching organization wallets");

    return this.get<WalletDto[]>(API_CONSTANTS.WALLETS.GET_WALLETS, token);
  }

  /**
   * Get the default wallet for the authenticated user's organization
   * @param token The authentication token
   * @returns Default wallet information
   */
  async getDefaultWallet(token: string): Promise<WalletDto> {
    this.logger.log("Fetching default wallet");

    return this.get<WalletDto>(API_CONSTANTS.WALLETS.GET_DEFAULT_WALLET, token);
  }

  /**
   * Set the default wallet for the authenticated user's organization
   * @param token The authentication token
   * @param walletId The ID of the wallet to set as default
   * @returns Updated wallet information
   */
  async setDefaultWallet(token: string, walletId: string): Promise<WalletDto> {
    this.logger.log(`Setting default wallet: ${walletId}`);

    const dto: SetDefaultWalletDto = { walletId };

    return this.post<WalletDto>(
      API_CONSTANTS.WALLETS.SET_DEFAULT_WALLET,
      dto,
      token
    );
  }

  /**
   * Get balances for all wallets in the authenticated user's organization
   * @param token The authentication token
   * @returns Wallet balances information
   */
  async getWalletBalances(token: string): Promise<WalletBalanceDto[]> {
    this.logger.log("Fetching wallet balances");

    return this.get<WalletBalanceDto[]>(
      API_CONSTANTS.WALLETS.GET_BALANCES,
      token
    );
  }
}
