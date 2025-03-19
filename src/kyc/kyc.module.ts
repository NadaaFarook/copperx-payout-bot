import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KycService } from "./kyc.service";
import { KycCommandHandler } from "../bot/handlers/kyc-command.handler";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [KycService, KycCommandHandler, TokenInterceptor],
  exports: [KycService, KycCommandHandler],
})
export class KycModule {}
