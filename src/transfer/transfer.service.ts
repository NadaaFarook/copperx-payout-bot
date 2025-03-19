import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { API_CONSTANTS } from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { BaseHttpService } from "../common/services/base-http.service";
import { PageDto } from "../common/dto/response.dto";
import {
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  CreateOfframpTransferDto,
  CreateSendTransferBatchDto,
  TransferWithTransactionsOnlyDto,
  TransferWithAccountDto,
  CreateSendTransferBatchResponseDto,
} from "./transfer.interface";

export interface TransfersResponseDto extends PageDto {
  data: TransferWithTransactionsOnlyDto[];
}

@Injectable()
export class TransferService extends BaseHttpService {
  protected readonly logger = new Logger(TransferService.name);
  protected readonly baseUrl = API_CONSTANTS.BASE_URL;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {
    super(httpService, tokenInterceptor);
  }

  /**
   * Get recent transfers for the authenticated user's organization
   * @param token The authentication token
   * @param page Page number
   * @param limit Items per page
   * @returns List of transfers
   */
  async getTransfers(
    token: string,
    page: number = 1,
    limit: number = 10
  ): Promise<TransfersResponseDto> {
    this.logger.log(`Fetching transfers (page: ${page}, limit: ${limit})`);

    return this.get<TransfersResponseDto>(
      API_CONSTANTS.TRANSFERS.GET_TRANSFERS,
      token,
      {
        page,
        limit,
      }
    );
  }

  /**
   * Send funds to a user by email or wallet address
   * @param token The authentication token
   * @param dto The send transfer request DTO
   * @returns Created transfer
   */
  async sendFunds(
    token: string,
    dto: CreateSendTransferDto
  ): Promise<TransferWithAccountDto> {
    this.logger.log(`Sending funds to ${dto.email || dto.walletAddress}`);

    return this.post<TransferWithAccountDto>(
      API_CONSTANTS.TRANSFERS.SEND,
      dto,
      token
    );
  }

  /**
   * Withdraw funds to an external wallet
   * @param token The authentication token
   * @param dto The wallet withdraw request DTO
   * @returns Created transfer
   */
  async withdrawToWallet(
    token: string,
    dto: CreateWalletWithdrawTransferDto
  ): Promise<TransferWithAccountDto> {
    this.logger.log(`Withdrawing funds to wallet ${dto.walletAddress}`);

    return this.post<TransferWithAccountDto>(
      API_CONSTANTS.TRANSFERS.WALLET_WITHDRAW,
      dto,
      token
    );
  }

  /**
   * Withdraw funds to a bank account (offramp)
   * @param token The authentication token
   * @param dto The offramp transfer request DTO
   * @returns Created transfer
   */
  async withdrawToBank(
    token: string,
    dto: CreateOfframpTransferDto
  ): Promise<TransferWithAccountDto> {
    this.logger.log("Withdrawing funds to bank account");

    return this.post<TransferWithAccountDto>(
      API_CONSTANTS.TRANSFERS.OFFRAMP,
      dto,
      token
    );
  }

  /**
   * Send funds to multiple recipients in a batch
   * @param token The authentication token
   * @param dto The batch send request DTO
   * @returns Batch response with results
   */
  async sendBatch(
    token: string,
    dto: CreateSendTransferBatchDto
  ): Promise<CreateSendTransferBatchResponseDto> {
    this.logger.log(
      `Sending batch transfer to ${dto.requests.length} recipients`
    );

    return this.post<CreateSendTransferBatchResponseDto>(
      API_CONSTANTS.TRANSFERS.SEND_BATCH,
      dto,
      token
    );
  }
}
