import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { AxiosRequestConfig } from "axios";
import { lastValueFrom } from "rxjs";
import { TokenInterceptor } from "../interceptors/token.interceptor";
import { REQUEST_TIMEOUT } from "../constants/api.constants";
import { CatchHttpError } from "../decorators/catch-error.decorator";

@Injectable()
export abstract class BaseHttpService {
  protected abstract readonly logger: Logger;
  protected abstract readonly baseUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly tokenInterceptor: TokenInterceptor
  ) {}

  /**
   * Make an authenticated GET request
   */
  @CatchHttpError(new Logger("BaseHttpService.get"))
  protected async get<T>(
    endpoint: string,
    token: string,
    params?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config = this.tokenInterceptor.intercept(token, {
      timeout: REQUEST_TIMEOUT,
      params,
    });

    const response = await lastValueFrom(this.httpService.get<T>(url, config));

    return response.data;
  }

  /**
   * Make an authenticated POST request
   */
  @CatchHttpError(new Logger("BaseHttpService.post"))
  protected async post<T>(
    endpoint: string,
    data: any,
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let config: AxiosRequestConfig = { timeout: REQUEST_TIMEOUT };

    if (token) {
      config = this.tokenInterceptor.intercept(token, config);
    }

    const response = await lastValueFrom(
      this.httpService.post<T>(url, data, config)
    );

    console.log(response.data);
    return response.data;
  }

  /**
   * Make an authenticated PUT request
   */
  @CatchHttpError(new Logger("BaseHttpService.put"))
  protected async put<T>(
    endpoint: string,
    data: any,
    token: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config = this.tokenInterceptor.intercept(token, {
      timeout: REQUEST_TIMEOUT,
    });

    const response = await lastValueFrom(
      this.httpService.put<T>(url, data, config)
    );

    return response.data;
  }

  /**
   * Make an authenticated DELETE request
   */
  @CatchHttpError(new Logger("BaseHttpService.delete"))
  protected async delete<T>(
    endpoint: string,
    token: string,
    params?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config = this.tokenInterceptor.intercept(token, {
      timeout: REQUEST_TIMEOUT,
      params,
    });

    const response = await lastValueFrom(
      this.httpService.delete<T>(url, config)
    );

    return response.data;
  }
}
