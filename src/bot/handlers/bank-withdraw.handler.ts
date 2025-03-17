import { Context, Markup } from "telegraf";
import { Logger } from "@nestjs/common";
import { TransferService } from "../../transfer/transfer.service";
import { QuoteService } from "../../quote/quote.service";
import {
  CreateOfframpTransferDto,
  TransferSessionData,
} from "../../transfer/transfer.interface";
import {
  Currency,
  PurposeCode,
  SourceOfFunds,
  TransferStep,
} from "../../transfer/transfer.enum";
import { PublicOfframpQuoteRequestDto } from "src/quote/quote.dto";
import { Country } from "src/quote/quote.enum";
import { formatStatus } from "src/common/utils/ui-formatter.util";

export class BankWithdrawHandler {
  private readonly logger = new Logger(BankWithdrawHandler.name);

  constructor(
    private readonly transferService: TransferService,
    private readonly quoteService: QuoteService
  ) {}

  /**
   * Handle bank withdraw command - Withdraw to bank account
   */
  async handleBankWithdrawCommand(ctx: Context, updateSession: Function) {
    const userId = ctx.from?.id;

    updateSession(userId, {
      transferSession: {
        step: TransferStep.BANK_WITHDRAW_AMOUNT,
      },
    });

    await ctx.reply(
      "💸 *Bank Withdrawal*\n\n" +
        "Please enter the amount you want to withdraw (in USD):\n\n" +
        "Example: 10.50",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
  }

  /**
   * Handle bank withdraw amount input with validation
   */
  private async handleBankWithdrawAmountInput(
    ctx: Context,
    amountText: string,
    transferSession: TransferSessionData,
    updateSession: Function
  ): Promise<boolean> {
    const userId = ctx.from?.id;

    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(amountText)) {
      await ctx.reply(
        "⚠️ Invalid amount format. Please enter a valid amount (e.g., 10.50):",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    const amount = parseFloat(amountText);
    const amountInSmallestUnit = Math.round(amount * 100000000).toString();

    // Update session with amount
    transferSession.amount = amountInSmallestUnit;
    transferSession.currency = Currency.USDC; // Default to USD for bank withdrawals
    transferSession.step = TransferStep.BANK_WITHDRAW_COUNTRY;
    updateSession(userId, { transferSession });

    await ctx.reply(
      `💰 Amount set to: *${amountText} USDC*\n\n` +
        "Please select the destination country:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("🇺🇸 USA", "country_US"),
            Markup.button.callback("🇬🇧 UK", "country_GB"),
          ],
          [
            Markup.button.callback("🇮🇳 India", "country_IN"),
            Markup.button.callback("🇪🇺 EU", "country_EU"),
          ],
          [
            Markup.button.callback("🇨🇦 Canada", "country_CA"),
            Markup.button.callback("🇸🇬 Singapore", "country_SG"),
          ],
          [
            Markup.button.callback(
              "Other (Type Country Code)",
              "country_other"
            ),
          ],
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
    return true;
  }

  /**
   * Handle country selection callback
   */
  async handleCountryCallback(
    ctx: Context,
    countryCode: string,
    getSession: Function,
    updateSession: Function
  ) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      const session = await getSession(userId);

      if (!session || !session.transferSession || !session.accessToken) {
        await ctx.reply("Session error. Please try again.");
        return;
      }

      const transferSession = session.transferSession as TransferSessionData;

      if (countryCode === "country_other") {
        await ctx.reply(
          "Please enter the destination country code (e.g., US, IN, GB):",
          Markup.inlineKeyboard([
            [Markup.button.callback("Cancel", "cancel_transfer")],
          ])
        );
        return;
      }

      const actualCountryCode = countryCode.replace("country_", "");

      await this.processBankWithdrawCountry(
        ctx,
        actualCountryCode,
        transferSession,
        session.accessToken,
        updateSession
      );
    } catch (error) {
      this.logger.error(`Error handling country selection: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Process bank withdraw country
   */
  private async processBankWithdrawCountry(
    ctx: Context,
    countryCode: string,
    transferSession: TransferSessionData,
    accessToken: string,
    updateSession: Function
  ) {
    const userId = ctx.from?.id;
    const sourceCountry: Country = Country.NONE;

    try {
      transferSession.destinationCountry = countryCode;
      await updateSession(userId, { transferSession });

      await ctx.reply("🔄 Requesting quote for your bank withdrawal...");

      const quoteRequest: PublicOfframpQuoteRequestDto = {
        sourceCountry,
        destinationCountry: countryCode,
        amount: transferSession.amount!,
      };

      const quoteResponse = await this.quoteService.getPublicOfframpQuote(
        accessToken,
        quoteRequest
      );

      if (quoteResponse.error) {
        await ctx.reply(
          `⚠️ Quote Error: ${quoteResponse.error}\n\n` +
            "Please try a different amount or destination country.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );

        updateSession(userId, { transferSession: null });
        return;
      }

      transferSession.quotePayload = quoteResponse.quotePayload;
      transferSession.quoteSignature = quoteResponse.quoteSignature;
      transferSession.step = TransferStep.BANK_WITHDRAW_PURPOSE;
      await updateSession(userId, { transferSession });

      const minAmount = parseInt(quoteResponse.minAmount) / 100000000;
      const maxAmount = parseInt(quoteResponse.maxAmount) / 100000000;
      const providerName = quoteResponse.provider?.name || "Default Provider";

      await ctx.reply(
        "📋 *Quote Details:*\n\n" +
          `*Provider:* ${providerName}\n` +
          `*Minimum Amount:* ${minAmount} USDC\n` +
          `*Maximum Amount:* ${maxAmount} USDC\n` +
          `*Expected Arrival:* ${quoteResponse.arrivalTimeMessage || "1-3 business days"}\n\n` +
          "Please select the purpose of this withdrawal:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("Personal", "bankpurpose_self"),
              Markup.button.callback("Gift", "bankpurpose_gift"),
            ],
            [
              Markup.button.callback("Family Support", "bankpurpose_family"),
              Markup.button.callback(
                "Reimbursement",
                "bankpurpose_reimbursement"
              ),
            ],
            [Markup.button.callback("Cancel", "cancel_transfer")],
          ]),
        }
      );
    } catch (error) {
      this.logger.error(`Error getting offramp quote: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while getting a quote for your withdrawal. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );

      updateSession(userId, { transferSession: null });
    }
  }

  /**
   * Handle bank withdraw purpose selection
   */
  async handleBankPurposeCallback(
    ctx: Context,
    purposeChoice: string,
    getSession: Function,
    updateSession: Function
  ) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      const session = await getSession(userId);

      if (!session || !session.transferSession) {
        await ctx.reply("Session error. Please try again.");
        return;
      }

      const transferSession = session.transferSession as TransferSessionData;
      let purposeCode: PurposeCode;

      switch (purposeChoice) {
        case "bankpurpose_self":
          purposeCode = PurposeCode.SELF;
          break;
        case "bankpurpose_gift":
          purposeCode = PurposeCode.GIFT;
          break;
        case "bankpurpose_family":
          purposeCode = PurposeCode.FAMILY;
          break;
        case "bankpurpose_reimbursement":
          purposeCode = PurposeCode.REIMBURSEMENT;
          break;
        default:
          await ctx.reply("Invalid selection. Please try again.");
          return;
      }

      transferSession.purposeCode = purposeCode;
      transferSession.sourceOfFunds = SourceOfFunds.SAVINGS; // Default source of funds
      transferSession.step = TransferStep.BANK_WITHDRAW_CONFIRMATION;
      updateSession(userId, { transferSession });

      const amountValue = parseInt(transferSession.amount!, 10);
      const formattedAmount = (amountValue / 100000000).toFixed(2);

      let confirmationMessage =
        "📋 *Please confirm the bank withdrawal details:*\n\n";
      confirmationMessage += `💰 *Amount:* ${formattedAmount} USDC\n`;
      confirmationMessage += `🏦 *Destination Country:* ${transferSession.destinationCountry}\n`;
      confirmationMessage += `🔍 *Purpose:* ${purposeCode}\n\n`;

      await ctx.reply(confirmationMessage, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Confirm ✅", "confirm_bankwithdraw"),
            Markup.button.callback("Cancel ❌", "cancel_transfer"),
          ],
        ]),
      });
    } catch (error) {
      this.logger.error(
        `Error handling bank purpose selection: ${error.message}`
      );
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle bank withdraw confirmation
   */
  async handleBankWithdrawConfirmCallback(
    ctx: Context,
    getSession: Function,
    updateSession: Function
  ) {
    const userId = ctx.from?.id;

    try {
      await ctx.answerCbQuery();

      const session = await getSession(userId);

      if (!session || !session.transferSession || !session.accessToken) {
        await ctx.reply("Session error. Please try again.");
        return;
      }

      const transferSession = session.transferSession as TransferSessionData;

      await ctx.reply("⏳ Processing your bank withdrawal...");

      const offrampTransferDto: CreateOfframpTransferDto = {
        purposeCode: transferSession.purposeCode!,
        sourceOfFunds: transferSession.sourceOfFunds!,
        quotePayload: transferSession.quotePayload!,
        quoteSignature: transferSession.quoteSignature!,
        recipientRelationship: "self",
        note: "Telegram bot bank withdrawal",
      };

      const result = await this.transferService.withdrawToBank(
        session.accessToken,
        offrampTransferDto
      );

      if (result) {
        const amountValue = parseInt(transferSession.amount!, 10);
        const formattedAmount = (amountValue / 100000000).toFixed(2);

        await ctx.reply(
          "✅ *Bank withdrawal submitted successfully!*\n\n" +
            `*Amount:* ${formattedAmount} USDC\n` +
            `*Destination Country:* ${transferSession.destinationCountry}\n` +
            `*Status:* ${formatStatus(result.status)}\n` +
            `*Transaction ID:* \`${result.id}\``,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback("View Transfers", "cmd_transfers"),
                Markup.button.callback("Main Menu", "cmd_menu"),
              ],
            ]),
          }
        );
      } else {
        await ctx.reply(
          "❌ Bank withdrawal failed to process. Please try again later or contact support.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error processing bank withdrawal: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while processing your bank withdrawal. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }

    updateSession(userId, { transferSession: null });
  }

  /**
   * Handle bank withdraw input states with support for callbacks
   */
  async handleBankWithdrawInput(
    ctx: Context,
    messageText: string,
    transferSession: TransferSessionData,
    accessToken: string,
    updateSession: Function
  ): Promise<boolean> {
    try {
      switch (transferSession.step) {
        case TransferStep.BANK_WITHDRAW_AMOUNT:
          return await this.handleBankWithdrawAmountInput(
            ctx,
            messageText,
            transferSession,
            updateSession
          );

        case TransferStep.BANK_WITHDRAW_COUNTRY:
          const countryCode = messageText.trim().toUpperCase();
          if (!countryCode || countryCode.length !== 2) {
            await ctx.reply(
              "⚠️ Invalid country code. Please enter a valid 2-letter country code (e.g., US, IN, GB):",
              Markup.inlineKeyboard([
                [Markup.button.callback("Cancel", "cancel_transfer")],
              ])
            );
            return true;
          }

          await this.processBankWithdrawCountry(
            ctx,
            countryCode,
            transferSession,
            accessToken,
            updateSession
          );
          return true;

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error handling bank withdraw input: ${error.message}`);
      await ctx.reply(
        "An error occurred. Please try again or contact support.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return true;
    }
  }
}
