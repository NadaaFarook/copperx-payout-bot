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
import { KycDto } from "./kyc.interface";
import { PageDto } from "../common/dto/response.dto";
import { CustomerProfileType, KycStatus } from "./kyc.enum";

export interface KycResponseDto extends PageDto {
  data: KycDto[];
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenInterceptor: TokenInterceptor
  ) {}

  /**
   * Get the KYC status of the authenticated user
   * @param token The authentication token
   * @returns KYC status information
   */
  async getKycStatus(token: string): Promise<KycResponseDto> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.KYC.GET_KYCS}`;

      this.logger.log("Fetching KYC status information");

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
        params: {
          page: 1,
          limit: 10, // Get the most recent KYC submissions
        },
      });

      const response = await lastValueFrom(
        this.httpService.get<KycResponseDto>(url, config)
      );

      this.logger.debug("KYC information retrieved successfully");
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        ErrorHandler.handleAxiosError(error);
      }
      ErrorHandler.handleGenericError(error);
    }
  }

  /**
   * Get a formatted user-friendly description of the KYC status
   * @param status KYC status code
   * @returns Human-readable status description
   */
  getStatusDescription(status: string): string {
    switch (status.toLowerCase()) {
      case KycStatus.PENDING:
        return "Your KYC application is pending review.";
      case KycStatus.INITIATED:
        return "Your KYC process has been initiated but not completed.";
      case KycStatus.INPROGRESS:
        return "Your KYC verification is in progress.";
      case KycStatus.REVIEW_PENDING:
        return "Your KYC application is waiting for review.";
      case KycStatus.REVIEW:
        return "Your KYC application is currently under review.";
      case KycStatus.PROVIDER_MANUAL_REVIEW:
        return "Your KYC application is under manual review by our provider.";
      case KycStatus.MANUAL_REVIEW:
        return "Your KYC application is under manual review.";
      case KycStatus.PROVIDER_ON_HOLD:
        return "Your KYC application is on hold with our provider.";
      case KycStatus.ON_HOLD:
        return "Your KYC application is on hold.";
      case KycStatus.EXPIRED:
        return "Your KYC application has expired. Please reapply.";
      case KycStatus.APPROVED:
        return "Your KYC application has been approved!";
      case KycStatus.REJECTED:
        return "Your KYC application has been rejected. Please check the reasons and reapply.";
      default:
        return "Your KYC status is being processed.";
    }
  }

  /**
   * Get estimated time to completion based on status
   * @param status KYC status code
   * @returns Estimated time to completion
   */
  getEstimatedTimeToCompletion(status: string): string {
    switch (status.toLowerCase()) {
      case KycStatus.PENDING:
      case KycStatus.INITIATED:
      case KycStatus.INPROGRESS:
        return "This typically takes 1-3 business days.";
      case KycStatus.REVIEW_PENDING:
      case KycStatus.REVIEW:
      case KycStatus.PROVIDER_MANUAL_REVIEW:
      case KycStatus.MANUAL_REVIEW:
        return "Manual review typically takes 2-5 business days.";
      case KycStatus.PROVIDER_ON_HOLD:
      case KycStatus.ON_HOLD:
        return "Please contact support for more information about your on-hold status.";
      case KycStatus.EXPIRED:
      case KycStatus.REJECTED:
        return "You will need to resubmit your application.";
      case KycStatus.APPROVED:
        return "Your verification is complete.";
      default:
        return "Processing time varies depending on the complexity of your application.";
    }
  }

  /**
   * Get next steps based on KYC status
   * @param status KYC status code
   * @param type Customer profile type
   * @returns Guidance on next steps
   */
  getNextSteps(status: string, type: string): string {
    const statusLower = status.toLowerCase();

    if (statusLower === KycStatus.APPROVED) {
      return "Your KYC is approved! You now have full access to all Copperx platform features.";
    } else if (statusLower === KycStatus.REJECTED) {
      return "Please review the feedback provided and resubmit your application with the necessary corrections.";
    } else if (statusLower === KycStatus.EXPIRED) {
      return "Please start a new KYC application on the Copperx platform.";
    } else if (
      [KycStatus.PROVIDER_ON_HOLD, KycStatus.ON_HOLD].includes(
        statusLower as KycStatus
      )
    ) {
      return "Please contact our support team for assistance with your application.";
    } else if (
      [
        KycStatus.PENDING,
        KycStatus.INITIATED,
        KycStatus.INPROGRESS,
        KycStatus.REVIEW_PENDING,
        KycStatus.REVIEW,
        KycStatus.PROVIDER_MANUAL_REVIEW,
        KycStatus.MANUAL_REVIEW,
      ].includes(statusLower as KycStatus)
    ) {
      if (type.toLowerCase() === CustomerProfileType.INDIVIDUAL) {
        return "Please ensure all your personal identification documents are clear and valid. You will be notified once the review is complete.";
      } else {
        return "Please ensure all your business documents are complete and valid. You will be notified once the review is complete.";
      }
    }

    return "Please complete your KYC verification on the Copperx platform.";
  }

  /**
   * Get emoji representing the KYC status
   * @param status KYC status
   * @returns Appropriate emoji
   */
  getStatusEmoji(status: string): string {
    const statusLower = status.toLowerCase();

    if (statusLower === KycStatus.APPROVED) {
      return "✅";
    } else if (statusLower === KycStatus.REJECTED) {
      return "❌";
    } else if (statusLower === KycStatus.EXPIRED) {
      return "⌛";
    } else if (
      [KycStatus.PROVIDER_ON_HOLD, KycStatus.ON_HOLD].includes(
        statusLower as KycStatus
      )
    ) {
      return "⏸️";
    } else if (
      [
        KycStatus.PENDING,
        KycStatus.INITIATED,
        KycStatus.INPROGRESS,
        KycStatus.REVIEW_PENDING,
        KycStatus.REVIEW,
        KycStatus.PROVIDER_MANUAL_REVIEW,
        KycStatus.MANUAL_REVIEW,
      ].includes(statusLower as KycStatus)
    ) {
      return "⏳";
    }

    return "❓";
  }

  /**
   * Format the profile type for display
   * @param type Profile type from API
   * @returns Formatted profile type
   */
  formatProfileType(type: string): string {
    if (type.toLowerCase() === CustomerProfileType.INDIVIDUAL) {
      return "Individual";
    } else if (type.toLowerCase() === CustomerProfileType.BUSINESS) {
      return "Business";
    }
    return type;
  }
}
