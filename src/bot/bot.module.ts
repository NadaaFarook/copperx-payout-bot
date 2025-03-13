import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BotService } from "./bot.service";
import { BotUpdate } from "./bot.update";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { KycService } from "../kyc/kyc.service";
import { WalletService } from "src/wallet/wallet.service";
import { AuthService } from "src/auth/auth.service";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [
    AuthService,
    BotService,
    BotUpdate,
    KycService,
    WalletService,
    TokenInterceptor,
  ],
  exports: [BotService],
})
export class BotModule {}
