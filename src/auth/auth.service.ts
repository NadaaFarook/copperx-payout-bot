import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { API_CONSTANTS } from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { BaseHttpService } from "../common/services/base-http.service";
import {
  AuthenticateResponseInterface,
  AuthUserInterface,
  LoginEmailOtpResponseInterface,
} from "./auth.interface";
import { LoginEmailOtpRequestDto, VerifyEmailOtpRequestDto } from "./auth.dto";

@Injectable()
export class AuthService extends BaseHttpService {
  protected readonly logger = new Logger(AuthService.name);
  protected readonly baseUrl = API_CONSTANTS.BASE_URL;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {
    super(httpService, tokenInterceptor);
  }

  /**
   * Request an OTP for email authentication
   * @param dto The email request DTO
   * @returns Success response
   */
  async requestEmailOtp(
    dto: LoginEmailOtpRequestDto
  ): Promise<LoginEmailOtpResponseInterface> {
    this.logger.log(`Requesting OTP for email: ${dto.email}`);
    return this.post<LoginEmailOtpResponseInterface>(
      API_CONSTANTS.AUTH.EMAIL_OTP_REQUEST,
      dto
    );
  }

  /**
   * Verify the OTP sent to the user's email
   * @param dto The verification request DTO
   * @returns Authentication token and expiry
   */
  async verifyEmailOtp(
    dto: VerifyEmailOtpRequestDto
  ): Promise<AuthenticateResponseInterface> {
    this.logger.log(`Verifying OTP for email: ${dto.email}`);
    return this.post<AuthenticateResponseInterface>(
      API_CONSTANTS.AUTH.EMAIL_OTP_AUTHENTICATE,
      dto
    );
  }

  /**
   * Get the authenticated user's information
   * @param token The authentication token
   * @returns User information
   */
  async getAuthUser(token: string): Promise<AuthUserInterface> {
    this.logger.log("Fetching authenticated user information");
    return this.get<AuthUserInterface>(API_CONSTANTS.AUTH.ME, token);
  }
}
