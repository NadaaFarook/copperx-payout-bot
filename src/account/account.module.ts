import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AccountService } from "./account.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [AccountService, TokenInterceptor],
  exports: [AccountService],
})
export class AccountModule {}
