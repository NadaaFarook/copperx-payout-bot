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
import { LoginEmailOtpRequestDto } from "./dto/login-email-otp-request.dto";
import { LoginEmailOtpResponseInterface } from "./interfaces/login-email-otp-response.interface";
import { VerifyEmailOtpRequestDto } from "./dto/verify-email-otp-request.dto";
import { AuthenticateResponseInterface } from "./interfaces/authenticate-response.interface";
import { AuthUserInterface } from "./interfaces/auth.interface";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenInterceptor: TokenInterceptor
  ) {}

  /**
   * Request an OTP for email authentication
   * @param dto The email request DTO
   * @returns Success response
   */
  async requestEmailOtp(
    dto: LoginEmailOtpRequestDto
  ): Promise<LoginEmailOtpResponseInterface> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.AUTH.EMAIL_OTP_REQUEST}`;

      this.logger.log(`Requesting OTP for email: ${dto.email}`);

      const response = await lastValueFrom(
        this.httpService.post<LoginEmailOtpResponseInterface>(url, dto, {
          timeout: REQUEST_TIMEOUT,
        })
      );

      this.logger.debug("OTP request successful");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Verify the OTP sent to the user's email
   * @param dto The verification request DTO
   * @returns Authentication token and expiry
   */
  async verifyEmailOtp(
    dto: VerifyEmailOtpRequestDto
  ): Promise<AuthenticateResponseInterface> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.AUTH.EMAIL_OTP_AUTHENTICATE}`;

      this.logger.log(`Verifying OTP for email: ${dto.email}`);

      const response = await lastValueFrom(
        this.httpService.post<AuthenticateResponseInterface>(url, dto, {
          timeout: REQUEST_TIMEOUT,
        })
      );

      this.logger.debug("OTP verification successful");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Get the authenticated user's information
   * @param token The authentication token
   * @returns User information
   */
  async getAuthUser(token: string): Promise<AuthUserInterface> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.AUTH.ME}`;

      this.logger.log("Fetching authenticated user information");

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.get<AuthUserInterface>(url, config)
      );

      this.logger.debug("User information retrieved successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }
}
