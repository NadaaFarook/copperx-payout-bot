import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { AxiosError } from "axios";
import { lastValueFrom } from "rxjs";
import {
  API_CONSTANTS,
  REQUEST_TIMEOUT,
} from "../common/constants/api.constants";
import { ErrorHandler } from "../common/utils/error-handler.util";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { WalletDto } from "./wallet.interface";
import { WalletBalanceDto } from "./wallet.interface";
import { SetDefaultWalletDto } from "./wallet.dto";

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenInterceptor: TokenInterceptor
  ) {}

  /**
   * Get all wallets for the authenticated user's organization
   * @param token The authentication token
   * @returns List of wallets
   */
  async getWallets(token: string): Promise<WalletDto[]> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.WALLETS.GET_WALLETS}`;

      this.logger.log("Fetching organization wallets");

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.get<WalletDto[]>(url, config)
      );

      this.logger.debug("Wallets retrieved successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Get the default wallet for the authenticated user's organization
   * @param token The authentication token
   * @returns Default wallet information
   */
  async getDefaultWallet(token: string): Promise<WalletDto> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.WALLETS.GET_DEFAULT_WALLET}`;

      this.logger.log("Fetching default wallet");

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.get<WalletDto>(url, config)
      );

      this.logger.debug("Default wallet retrieved successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Set the default wallet for the authenticated user's organization
   * @param token The authentication token
   * @param walletId The ID of the wallet to set as default
   * @returns Updated wallet information
   */
  async setDefaultWallet(token: string, walletId: string): Promise<WalletDto> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.WALLETS.SET_DEFAULT_WALLET}`;

      this.logger.log(`Setting default wallet: ${walletId}`);

      const dto: SetDefaultWalletDto = { walletId };
      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.post<WalletDto>(url, dto, config)
      );

      this.logger.debug("Default wallet set successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Get balances for all wallets in the authenticated user's organization
   * @param token The authentication token
   * @returns Wallet balances information
   */
  async getWalletBalances(token: string): Promise<WalletBalanceDto[]> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.WALLETS.GET_BALANCES}`;

      this.logger.log("Fetching wallet balances");

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.get<WalletBalanceDto[]>(url, config)
      );

      this.logger.debug("Wallet balances retrieved successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Format wallet address for display by shortening it
   * @param address Full wallet address
   * @returns Shortened address for display
   */
  formatWalletAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * Format network name for display
   * @param network Network identifier
   * @returns Formatted network name
   */
  formatNetworkName(network: string): string {
    // Map network IDs to human-readable names
    const networkMap: { [key: string]: string } = {
      "137": "Polygon",
      "80002": "Polygon Mumbai",
      "1": "Ethereum",
      "11155111": "Sepolia",
      "42161": "Arbitrum",
      "421614": "Arbitrum Sepolia",
      "8453": "Base",
      "84532": "Base Sepolia",
      "10": "Optimism",
      "11155420": "Optimism Sepolia",
      "56": "BSC",
      "97": "BSC Testnet",
      "23434": "Starknet",
    };

    return networkMap[network as keyof typeof networkMap] || network;
  }
}
