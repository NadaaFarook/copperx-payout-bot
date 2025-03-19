import { Module } from "@nestjs/common";
import { BasicCommandHandler } from "./basic-command.handler";
import { AuthCommandHandler } from "./auth-command.handler";
import { KycCommandHandler } from "./kyc-command.handler";
import { WalletCommandHandler } from "./wallet-command.handler";
import { TransferCommandHandler } from "./transfer-command.handler";
import { BankWithdrawHandler } from "./bank-withdraw.handler";
import { CallbackQueryHandler } from "./callback-query.handler";
import { AuthModule } from "../../auth/auth.module";
import { KycModule } from "../../kyc/kyc.module";
import { WalletModule } from "../../wallet/wallet.module";
import { TransferModule } from "../../transfer/transfer.module";
import { QuoteModule } from "../../quote/quote.module";
import { SessionModule } from "../../session/session.module";
import { AccountModule } from "src/account/account.module";

@Module({
  imports: [
    AuthModule,
    KycModule,
    WalletModule,
    TransferModule,
    QuoteModule,
    SessionModule,
    AccountModule,
  ],
  providers: [
    BasicCommandHandler,
    AuthCommandHandler,
    KycCommandHandler,
    WalletCommandHandler,
    TransferCommandHandler,
    BankWithdrawHandler,
    CallbackQueryHandler,
  ],
  exports: [
    BasicCommandHandler,
    AuthCommandHandler,
    KycCommandHandler,
    WalletCommandHandler,
    TransferCommandHandler,
    BankWithdrawHandler,
    CallbackQueryHandler,
  ],
})
export class HandlersModule {}
