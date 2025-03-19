import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { AxiosError } from "axios";

export class ErrorHandler {
  private static readonly logger = new Logger("ErrorHandler");

  static handleAxiosError(error: AxiosError): never {
    const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      (error.response?.data as any).message || "An unexpected error occurred";

    // console.log(error.response?.data, message, "error.response?.data");

    this.logger.error(`API Error: ${status} - ${message}`);

    throw new HttpException(message, status);
  }

  static handleGenericError(error: any): never {
    const message =
      error.response?.data?.message || "An unexpected error occurred";
    this.logger.error(`Generic Error: ${message}`);

    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
