import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BotService } from "./bot.service";
import { BotUpdate } from "./bot.update";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { KycService } from "../kyc/kyc.service";
import { WalletService } from "../wallet/wallet.service";
import { AuthService } from "../auth/auth.service";
import { NotificationService } from "../notification/notification.service";
import { TransferService } from "../transfer/transfer.service";
import { RedisSessionStore } from "../redis-session-store";
import { SessionManager } from "./session-manager";
import { QuoteService } from "src/quote/quote.service";

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
    NotificationService,
    TransferService,
    QuoteService,
    TokenInterceptor,
    RedisSessionStore,
    SessionManager,
  ],
  exports: [BotService],
})
export class BotModule {}
