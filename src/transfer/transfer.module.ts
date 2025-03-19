import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TransferService } from "./transfer.service";
import { TransferCommandHandler } from "../bot/handlers/transfer-command.handler";
import { BankWithdrawHandler } from "../bot/handlers/bank-withdraw.handler";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { QuoteModule } from "src/quote/quote.module";
import { SessionModule } from "../session/session.module";
import { AccountModule } from "../account/account.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    QuoteModule,
    SessionModule,
    AccountModule,
  ],
  providers: [
    TransferService,
    TransferCommandHandler,
    BankWithdrawHandler,
    TokenInterceptor,
  ],
  exports: [TransferService, TransferCommandHandler, BankWithdrawHandler],
})
export class TransferModule {}
