import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AuthService } from "./auth.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [AuthService, TokenInterceptor],
  exports: [AuthService],
})
export class AuthModule {}
