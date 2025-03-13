import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { AxiosError } from "axios";

export class ErrorHandler {
  private static readonly logger = new Logger("ErrorHandler");

  static handleAxiosError(error: AxiosError): never {
    const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || "An unexpected error occurred";

    this.logger.error(`API Error: ${status} - ${message}`);
    this.logger.debug(
      `Error details: ${JSON.stringify(error.response?.data || {})}`
    );

    throw new HttpException(message, status);
  }

  static handleGenericError(error: any): never {
    const message = error.message || "An unexpected error occurred";
    this.logger.error(`Generic Error: ${message}`);
    this.logger.debug(`Error details: ${JSON.stringify(error)}`);

    throw new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
