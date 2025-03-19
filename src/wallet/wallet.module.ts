import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { WalletService } from "./wallet.service";
import { WalletCommandHandler } from "../bot/handlers/wallet-command.handler";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [WalletService, WalletCommandHandler, TokenInterceptor],
  exports: [WalletService, WalletCommandHandler],
})
export class WalletModule {}
