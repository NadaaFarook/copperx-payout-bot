import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AuthModule } from "../auth/auth.module";
import { BotService } from "./bot.service";
import { BotUpdate } from "./bot.update";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { KycService } from "src/kyc/kyc.service";

@Module({
  imports: [
    AuthModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [BotService, BotUpdate, KycService, TokenInterceptor],
  exports: [BotService],
})
export class BotModule {}
