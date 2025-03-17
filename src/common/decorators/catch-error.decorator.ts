import { Logger } from "@nestjs/common";
import { AxiosError } from "axios";
import { ErrorHandler } from "../utils/error-handler.util";

/**
 * Decorator that wraps a method with standardized error handling
 * @param logger Logger instance to use for error logging
 */
export function CatchHttpError(logger: Logger) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        logger.error(
          `Error in ${target.constructor.name}.${propertyKey}: ${error.message}`
        );

        if (error instanceof AxiosError) {
          ErrorHandler.handleAxiosError(error);
        }

        ErrorHandler.handleGenericError(error);
      }
    };

    return descriptor;
  };
}
