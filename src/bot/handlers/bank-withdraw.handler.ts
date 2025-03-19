import { Context, Markup } from "telegraf";
import { Injectable, Logger } from "@nestjs/common";
import { TransferService } from "../../transfer/transfer.service";
import { QuoteService } from "../../quote/quote.service";
import { AccountService } from "../../account/account.service";
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
import { formatStatus } from "src/common/utils/ui-formatter.util";
import { SessionManager } from "../session-manager";

@Injectable()
export class BankWithdrawHandler {
  private readonly logger = new Logger(BankWithdrawHandler.name);

  constructor(
    private readonly transferService: TransferService,
    private readonly quoteService: QuoteService,
    private readonly accountService: AccountService,
    private readonly sessionManager: SessionManager
  ) {}

  /**
   * Handle bank withdraw command - Withdraw to bank account
   */
  async handleBankWithdrawCommand(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    await this.sessionManager.updateSession(userId, {
      transferSession: {
        step: TransferStep.BANK_WITHDRAW_AMOUNT,
      },
    });

    await ctx.reply(
      "💸 *Bank Withdrawal*\n\n" +
        "Please enter the amount you want to withdraw (in USD):\n\n" +
        "Example: 50.50",
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
    transferSession: TransferSessionData
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(amountText)) {
      await ctx.reply(
        "⚠️ Invalid amount format. Please enter a valid amount (e.g., 50.50):",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return true;
    }

    const amount = parseFloat(amountText);
    const amountInSmallestUnit = Math.round(amount * 100000000).toString();

    if (amount < 50) {
      await ctx.reply(
        "⚠️ Minimum withdrawal amount is 50 USD. Please enter a higher amount:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    // Update session with amount
    transferSession.amount = amountInSmallestUnit;
    transferSession.currency = Currency.USDC; // Default to USD for bank withdrawals
    transferSession.step = TransferStep.BANK_WITHDRAW_COUNTRY;
    await this.sessionManager.updateSession(userId, { transferSession });

    await ctx.reply(
      `💰 Amount set to: *${amountText} USDC*\n\n` +
        "Please select the destination country:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("🇬🇧 UK", "country_GBR"),
            Markup.button.callback("🇮🇳 India", "country_IND"),
          ],
          [
            Markup.button.callback("🇨🇦 Canada", "country_CAN"),
            Markup.button.callback("🇸🇬 Singapore", "country_SGP"),
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
  async handleCountryCallback(ctx: Context, countryCode: string) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      const session = await this.sessionManager.getSession(userId);

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
      transferSession.destinationCountry = actualCountryCode;
      transferSession.step = TransferStep.BANK_WITHDRAW_SELECT_ACCOUNT;
      await this.sessionManager.updateSession(userId, { transferSession });

      // Check for bank accounts and display them
      await this.handleBankAccountSelection(
        ctx,
        session.accessToken,
        actualCountryCode
      );
    } catch (error) {
      this.logger.error(`Error handling country selection: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle bank account selection - now with country filtering
   */
  private async handleBankAccountSelection(
    ctx: Context,
    accessToken: string,
    countryCode: string
  ) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.reply("🏦 Fetching your bank accounts...");

      const allBankAccounts =
        await this.accountService.getBankAccounts(accessToken);

      // Filter bank accounts by country
      const bankAccounts = allBankAccounts.filter(
        (account) =>
          account.country &&
          account.country.toLowerCase() === countryCode.toLowerCase()
      );

      if (!bankAccounts || bankAccounts.length === 0) {
        await ctx.reply(
          `❌ You don't have any bank accounts configured for the selected country (${countryCode}). Please add a bank account on the Copperx platform first, or select a different country.`,
          Markup.inlineKeyboard([
            [
              Markup.button.url(
                "Go to Copperx Platform",
                "https://payout.copperx.io"
              ),
            ],
            [
              Markup.button.callback(
                "Choose Another Country",
                "cmd_bankwithdraw"
              ),
            ],
          ])
        );
        return;
      }

      // Create buttons for bank account selection
      const accountButtons = bankAccounts.map((account) => {
        const bankName = account.bankAccount?.bankName || "Bank Account";
        const accountNumber = account.bankAccount?.accountNumber
          ? `(${account.bankAccount.accountNumber.slice(-4)})`
          : "";
        const buttonText = `${bankName} ${accountNumber}`;

        return [
          Markup.button.callback(buttonText, `bankaccount_${account.id}`),
        ];
      });

      accountButtons.push([
        Markup.button.callback("Choose Another Country", "cmd_bankwithdraw"),
        Markup.button.callback("Cancel", "cancel_transfer"),
      ]);

      await ctx.reply(
        `🏦 *Select a Bank Account for Withdrawal to ${countryCode}*\n\n` +
          "Please choose the bank account you want to withdraw to:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard(accountButtons),
        }
      );
    } catch (error) {
      this.logger.error(`Error fetching bank accounts: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while fetching your bank accounts. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle bank account selection callback
   */
  async handleBankAccountCallback(ctx: Context, callbackData: string) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      const session = await this.sessionManager.getSession(userId);

      if (!session || !session.transferSession || !session.accessToken) {
        await ctx.reply("Session error. Please try again.");
        return;
      }

      const transferSession = session.transferSession as TransferSessionData;
      const bankAccountId = callbackData.replace("bankaccount_", "");

      // Store the selected bank account ID
      transferSession.preferredBankAccountId = bankAccountId;
      await this.sessionManager.updateSession(userId, { transferSession });

      await ctx.reply("🔄 Requesting quote for your bank withdrawal...");

      // Get all bank accounts to display info about the selected one
      const bankAccounts = await this.accountService.getBankAccounts(
        session.accessToken
      );
      const selectedAccount = bankAccounts.find(
        (acc) => acc.id === bankAccountId
      );

      if (!selectedAccount) {
        await ctx.reply(
          "❌ Selected bank account not found. Please try again.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
        return;
      }

      // Verify that the bank account's country matches the destination country
      if (
        selectedAccount.country &&
        selectedAccount.country.toLowerCase() !==
          transferSession.destinationCountry?.toLowerCase()
      ) {
        await ctx.reply(
          `❌ The selected bank account does not match the destination country (${transferSession.destinationCountry}).\n\nPlease select a bank account that matches the destination country.`,
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
        return;
      }

      await this.requestQuoteWithBankAccount(
        ctx,
        transferSession,
        session.accessToken
      );
    } catch (error) {
      this.logger.error(
        `Error handling bank account selection: ${error.message}`
      );
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Request quote with bank account
   */
  private async requestQuoteWithBankAccount(
    ctx: Context,
    transferSession: TransferSessionData,
    accessToken: string
  ) {
    try {
      const quoteRequest: PublicOfframpQuoteRequestDto = {
        sourceCountry: "none",
        destinationCountry: transferSession.destinationCountry!.toLowerCase(),
        amount: transferSession.amount!,
        currency: transferSession.currency!,
        preferredBankAccountId: transferSession.preferredBankAccountId,
      };

      this.logger.log(
        `Requesting quote with bank account: ${JSON.stringify(quoteRequest)}`
      );
      const quoteResponse = await this.quoteService.getPublicOfframpQuote(
        accessToken,
        quoteRequest
      );

      if (quoteResponse.error) {
        await ctx.reply(
          `⚠️ Quote Error: ${quoteResponse.error}\n\n` +
            "Please try a different amount, destination country, or bank account.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );

        await this.sessionManager.updateSession(ctx.from!.id, {
          transferSession: null,
        });
        return;
      }

      transferSession.quotePayload = quoteResponse.quotePayload;
      transferSession.quoteSignature = quoteResponse.quoteSignature;
      transferSession.step = TransferStep.BANK_WITHDRAW_PURPOSE;
      await this.sessionManager.updateSession(ctx.from!.id, {
        transferSession,
      });

      const quotePayload = JSON.parse(quoteResponse.quotePayload);

      const providerName = quoteResponse.provider?.name || "Default Provider";

      const amountToSend = `${parseInt(quotePayload.amount) / 100000000} USD`;
      const exchangeRate = `USD 1 ≈ ${quotePayload.toCurrency} ${quotePayload.rate}`;

      const processingFee = `USD ${2 + ((1.5 / 100) * parseInt(quotePayload.amount)) / 100000000} (2 USD fixed cost per transaction + 1.5% of the amount)`;
      const totalAmount = `${quotePayload.toCurrency} ${parseInt(quotePayload.toAmount) / 100000000}`;

      const processingTime = `1-3 business days`;

      await ctx.reply(
        `💸 *Bank Withdrawal Quote*\n\n` +
          `*Amount to Send:* ${amountToSend}\n` +
          `*Exchange Rate:* ${exchangeRate}\n` +
          `*Processing Fee:* ${processingFee}\n` +
          `*Total Recievable:* ${totalAmount}\n` +
          `*Processing Time:* ${processingTime}\n\n` +
          `🏦 *Provider:* ${providerName}\n\n` +
          "Please select the purpose of this bank withdrawal:",
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

      await this.sessionManager.updateSession(ctx.from!.id, {
        transferSession: null,
      });
    }
  }

  /**
   * Process bank withdraw country
   */
  private async processBankWithdrawCountry(
    ctx: Context,
    countryCode: string,
    transferSession: TransferSessionData,
    accessToken: string
  ) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      transferSession.destinationCountry = countryCode;
      transferSession.step = TransferStep.BANK_WITHDRAW_SELECT_ACCOUNT;
      await this.sessionManager.updateSession(userId, { transferSession });

      // Redirect to bank account selection - pass country code
      await this.handleBankAccountSelection(ctx, accessToken, countryCode);
    } catch (error) {
      this.logger.error(`Error processing country: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while processing your request. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );

      await this.sessionManager.updateSession(userId, {
        transferSession: null,
      });
    }
  }

  /**
   * Handle bank withdraw purpose selection
   */
  async handleBankPurposeCallback(ctx: Context, purposeChoice: string) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      const session = await this.sessionManager.getSession(userId);

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
      await this.sessionManager.updateSession(userId, { transferSession });

      const amountValue = parseInt(transferSession.amount!, 10);
      const formattedAmount = (amountValue / 100000000).toFixed(2);

      // Get bank account info if possible
      let bankAccountInfo = "";
      if (transferSession.preferredBankAccountId && session.accessToken) {
        try {
          const bankAccounts = await this.accountService.getBankAccounts(
            session.accessToken
          );
          const selectedAccount = bankAccounts.find(
            (acc) => acc.id === transferSession.preferredBankAccountId
          );

          if (selectedAccount && selectedAccount.bankAccount) {
            const bankAcc = selectedAccount.bankAccount;
            bankAccountInfo = `\n🏦 *Bank:* ${bankAcc.bankName || "N/A"}\n`;

            if (bankAcc.accountNumber) {
              // Only show last 4 digits for security
              const maskedNumber = "XXXX" + bankAcc.accountNumber.slice(-4);
              bankAccountInfo += `📝 *Account:* ${maskedNumber}\n`;
            }
          }
        } catch (error) {
          this.logger.error(
            `Error fetching bank account details: ${error.message}`
          );
        }
      }

      let confirmationMessage =
        "📋 *Please confirm the bank withdrawal details:*\n\n";
      confirmationMessage += `💰 *Amount:* ${formattedAmount} USDC\n`;
      confirmationMessage += `🌍 *Destination Country:* ${transferSession.destinationCountry}\n`;
      confirmationMessage += bankAccountInfo;
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
  async handleBankWithdrawConfirmCallback(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.answerCbQuery();

      const session = await this.sessionManager.getSession(userId);

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
        // preferredBankAccountId: transferSession.preferredBankAccountId,
      };

      const result = await this.transferService.withdrawToBank(
        session.accessToken,
        offrampTransferDto
      );

      if (result) {
        const amountValue = parseInt(transferSession.amount!, 10);
        const formattedAmount = (amountValue / 100000000).toFixed(2);

        // Get bank account info if possible
        let bankAccountInfo = "";
        if (transferSession.preferredBankAccountId) {
          try {
            const bankAccounts = await this.accountService.getBankAccounts(
              session.accessToken
            );
            const selectedAccount = bankAccounts.find(
              (acc) => acc.id === transferSession.preferredBankAccountId
            );

            if (selectedAccount && selectedAccount.bankAccount) {
              const bankAcc = selectedAccount.bankAccount;
              if (bankAcc.bankName) {
                bankAccountInfo = `*Bank:* ${bankAcc.bankName}\n`;
              }

              if (bankAcc.accountNumber) {
                // Only show last 4 digits for security
                const maskedNumber = "XXXX" + bankAcc.accountNumber.slice(-4);
                bankAccountInfo += `*Account:* ${maskedNumber}\n`;
              }
            }
          } catch (error) {
            this.logger.error(
              `Error fetching bank account details: ${error.message}`
            );
          }
        }

        await ctx.reply(
          "✅ *Bank withdrawal submitted successfully!*\n\n" +
            `*Amount:* ${formattedAmount} USDC\n` +
            `*Destination Country:* ${transferSession.destinationCountry}\n` +
            (bankAccountInfo ? bankAccountInfo : "") +
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
        `❌ ${error.message}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }

    await this.sessionManager.updateSession(userId, { transferSession: null });
  }

  /**
   * Handle bank withdraw input states with support for callbacks
   */
  async handleBankWithdrawInput(
    ctx: Context,
    messageText: string,
    transferSession: TransferSessionData,
    accessToken: string
  ): Promise<boolean> {
    try {
      switch (transferSession.step) {
        case TransferStep.BANK_WITHDRAW_AMOUNT:
          return await this.handleBankWithdrawAmountInput(
            ctx,
            messageText,
            transferSession
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
            accessToken
          );
          return true;

        case TransferStep.BANK_WITHDRAW_SELECT_ACCOUNT:
          await ctx.reply(
            "⚠️ Please select a bank account using the buttons provided.\n\nIf you don't see your bank account, please add one on the Copperx platform.",
            Markup.inlineKeyboard([
              [Markup.button.callback("Try Again", "cmd_bankwithdraw")],
              [Markup.button.callback("Cancel", "cancel_transfer")],
            ])
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
