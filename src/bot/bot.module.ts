import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { BotService } from "./bot.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { HandlersModule } from "./handlers/handlers.module";
import { SessionModule } from "../session/session.module";
import { AuthModule } from "../auth/auth.module";
import { KycModule } from "../kyc/kyc.module";
import { WalletModule } from "../wallet/wallet.module";
import { NotificationModule } from "../notification/notification.module";
import { TransferModule } from "../transfer/transfer.module";
import { QuoteModule } from "../quote/quote.module";
import { MessageHandler } from "./message-handler";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    HandlersModule,
    SessionModule,
    AuthModule,
    KycModule,
    WalletModule,
    NotificationModule,
    TransferModule,
    QuoteModule,
  ],
  providers: [BotService, TokenInterceptor, MessageHandler],
  exports: [BotService],
})
export class BotModule {}
