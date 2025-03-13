import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { AxiosRequestConfig } from "axios";

@Injectable()
export class TokenInterceptor {
  constructor() {}

  intercept(token: string, config: AxiosRequestConfig): AxiosRequestConfig {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  }
}
