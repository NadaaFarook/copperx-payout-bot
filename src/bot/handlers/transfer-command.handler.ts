import { Context, Markup } from "telegraf";
import { Injectable, Logger } from "@nestjs/common";
import { TransferService } from "../../transfer/transfer.service";
import {
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  TransferSessionData,
} from "../../transfer/transfer.interface";
import {
  Currency,
  PurposeCode,
  SourceOfFunds,
  TransferStep,
} from "src/transfer/transfer.enum";
import { BankWithdrawHandler } from "./bank-withdraw.handler";
import {
  formatAmount,
  formatStatus,
  formatTransferType,
} from "src/common/utils/ui-formatter.util";
import { AuthenticatedContext } from "src/auth-middleware";
import { SessionManager } from "../session-manager";

@Injectable()
export class TransferCommandHandler {
  private readonly logger = new Logger(TransferCommandHandler.name);

  constructor(
    private readonly transferService: TransferService,
    private readonly bankWithdrawHandler: BankWithdrawHandler,
    private readonly sessionManager: SessionManager
  ) {}

  /**
   * Handle send command with interactive options
   */
  async handleSendCommand(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { authenticated } = await this.sessionManager.isAuthenticated(userId);

    if (!authenticated) {
      await ctx.reply(
        "You need to be logged in to send funds.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login Now", "cmd_login")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return;
    }

    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.split(" ");
    const method = parts.length > 1 ? parts[1].toLowerCase() : "";

    // Initialize transfer session
    const transferSession: TransferSessionData = {
      step: TransferStep.NONE,
    };

    if (method === "email") {
      transferSession.step = TransferStep.SEND_EMAIL_RECIPIENT;
      await this.sessionManager.updateSession(userId, { transferSession });
      await ctx.reply(
        "📧 *Send by Email*\n\n" +
          "Please enter the recipient's email address:\n\n" +
          "Example: recipient@example.com",
        { parse_mode: "Markdown" }
      );
    } else if (method === "wallet") {
      transferSession.step = TransferStep.SEND_WALLET_RECIPIENT;
      await this.sessionManager.updateSession(userId, { transferSession });
      await ctx.reply(
        "💼 *Send by Wallet Address*\n\n" +
          "Please enter the recipient's wallet address:\n\n" +
          "Example: 0x1234abcd..."
      );
    } else {
      await ctx.reply(
        "💸 *Send Funds*\n\n" + "How would you like to send money?",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("By Email 📧", "send_email"),
              Markup.button.callback("By Wallet 💼", "send_wallet"),
            ],
            [Markup.button.callback("« Back to Main Menu", "cmd_menu")],
          ]),
        }
      );
    }
  }

  /**
   * Handle send method callback
   */
  async handleSendMethodCallback(ctx: Context, method: string) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      const { authenticated } =
        await this.sessionManager.isAuthenticated(userId);

      if (!authenticated) {
        await ctx.reply(
          "You need to be logged in to send funds.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Login Now", "cmd_login")],
          ])
        );
        return;
      }

      // Initialize transfer session
      const transferSession: TransferSessionData = {
        step: TransferStep.NONE,
      };

      if (method === "send_email") {
        transferSession.step = TransferStep.SEND_EMAIL_RECIPIENT;
        await this.sessionManager.updateSession(userId, { transferSession });
        await ctx.reply(
          "📧 *Send by Email*\n\n" +
            "Please enter the recipient's email address:\n\n" +
            "Example: recipient@example.com",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("Cancel", "cancel_transfer")],
            ]),
          }
        );
      } else if (method === "send_wallet") {
        transferSession.step = TransferStep.SEND_WALLET_RECIPIENT;
        await this.sessionManager.updateSession(userId, { transferSession });
        await ctx.reply(
          "💼 *Send by Wallet Address*\n\n" +
            "Please enter the recipient's wallet address:\n\n" +
            "Example: 0x1234abcd...",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("Cancel", "cancel_transfer")],
            ]),
          }
        );
      }
    } catch (error) {
      this.logger.error(`Error handling send method: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle withdraw command with inline keyboard
   */
  async handleWithdrawCommand(ctx: Context) {
    await ctx.reply("💼 *Wallet Withdrawal*\n\nSelect a withdrawal option:", {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback("To Crypto Wallet 💼", "withdraw_wallet"),
          Markup.button.callback("To Bank 🏦", "withdraw_bank"),
        ],
        [Markup.button.callback("Check Balance First", "cmd_balance")],
        [Markup.button.callback("« Back to Main Menu", "cmd_menu")],
      ]),
    });
  }

  /**
   * Handle withdraw method callback
   */
  async handleWithdrawMethodCallback(ctx: Context, method: string) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      const { authenticated } =
        await this.sessionManager.isAuthenticated(userId);

      if (!authenticated) {
        await ctx.reply(
          "You need to be logged in to withdraw funds.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Login Now", "cmd_login")],
          ])
        );
        return;
      }

      if (method === "withdraw_wallet") {
        const transferSession: TransferSessionData = {
          step: TransferStep.WITHDRAW_WALLET_ADDRESS,
        };

        await this.sessionManager.updateSession(userId, { transferSession });
        await ctx.reply(
          "💼 *Wallet Withdrawal*\n\n" +
            "Please enter the wallet address to withdraw to:\n\n" +
            "Example: 0x1234abcd...",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("Cancel", "cancel_transfer")],
            ]),
          }
        );
      } else if (method === "withdraw_bank") {
        // Delegate to bank withdraw handler
        await this.bankWithdrawHandler.handleBankWithdrawCommand(ctx);
      }
    } catch (error) {
      this.logger.error(`Error handling withdraw method: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle cancel transfer callback
   */
  async handleCancelTransferCallback(ctx: Context) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;
      if (!userId) return;

      await this.sessionManager.updateSession(userId, {
        transferSession: null,
      });

      await ctx.reply(
        "✅ Transaction cancelled.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    } catch (error) {
      this.logger.error(`Error cancelling transfer: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle transfers command with inline options
   */
  async handleTransfersCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("📝 Fetching your recent transfers...");

      // Get transfers using the transfer service
      const transfersResponse = await this.transferService.getTransfers(
        ctx.session.accessToken,
        1, // Page 1
        10 // Limit 10 items
      );

      if (
        transfersResponse &&
        transfersResponse.data &&
        transfersResponse.data.length > 0
      ) {
        // Format transfers list with markdown
        let transfersMessage = "📝 *Your Recent Transfers:*\n\n";

        transfersResponse.data.forEach((transfer, index) => {
          const formattedDate = new Date(
            transfer.createdAt
          ).toLocaleDateString();
          const formattedStatus = formatStatus(transfer.status);
          const formattedType = formatTransferType(transfer.type);
          const formattedAmount = formatAmount(
            transfer.amount,
            transfer.currency
          );

          transfersMessage += `*${index + 1}. ${formattedType} - ${formattedDate}*\n`;
          transfersMessage += `   *ID:* ${transfer.id}\n`;
          transfersMessage += `   *Amount:* ${formattedAmount}\n`;
          transfersMessage += `   *Status:* ${formattedStatus}\n`;

          // Add recipient/destination info if available
          if (
            transfer.type.toLowerCase() === "send" &&
            transfer.destinationAccount
          ) {
            if (transfer.destinationAccount.payeeEmail) {
              transfersMessage += `   *To:* ${transfer.destinationAccount.payeeEmail}\n`;
            } else if (transfer.destinationAccount.walletAddress) {
              const formattedAddress =
                transfer.destinationAccount.walletAddress.substring(0, 8) +
                "..." +
                transfer.destinationAccount.walletAddress.substring(
                  transfer.destinationAccount.walletAddress.length - 8
                );
              transfersMessage += `   *To:* \`${formattedAddress}\`\n`;
            }
          }

          transfersMessage += "\n";
        });

        const inlineButtons = [
          [
            Markup.button.callback("Send Funds", "menu_send"),
            Markup.button.callback("Withdraw", "cmd_withdraw"),
          ],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ];

        await ctx.reply(transfersMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard(inlineButtons),
        });
      } else {
        await ctx.reply(
          "You don't have any transfers yet.",
          Markup.inlineKeyboard([
            [
              Markup.button.callback("Send Funds", "menu_send"),
              Markup.button.callback("Main Menu", "cmd_menu"),
            ],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching transfers: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your transfers. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_transfers")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle send email recipient input
   */
  private async handleSendEmailRecipientInput(
    ctx: Context,
    email: string,
    transferSession: TransferSessionData
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      await ctx.reply(
        "⚠️ Invalid email format. Please enter a valid email address:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    transferSession.recipientEmail = email;
    transferSession.step = TransferStep.SEND_AMOUNT;
    await this.sessionManager.updateSession(userId, { transferSession });

    await ctx.reply(
      `📧 Recipient email set to: *${email}*\n\n` +
        "Please enter the amount to send (in USDC):",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
    return true;
  }

  /**
   * Handle wallet recipient input
   */
  private async handleSendWalletRecipientInput(
    ctx: Context,
    walletAddress: string,
    transferSession: TransferSessionData
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    if (!walletAddress || walletAddress.trim().length < 10) {
      await ctx.reply(
        "⚠️ Invalid wallet address. Please enter a valid wallet address:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    // Update session with wallet address
    transferSession.recipientWalletAddress = walletAddress;
    transferSession.step = TransferStep.SEND_AMOUNT;
    await this.sessionManager.updateSession(userId, { transferSession });

    await ctx.reply(
      `💼 Recipient wallet address set to: \`${walletAddress}\`\n\n` +
        "Please enter the amount to send (in USDC):",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
    return true;
  }

  /**
   * Handle amount input with improved validation
   */
  private async handleAmountInput(
    ctx: Context,
    amountText: string,
    transferSession: TransferSessionData
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(amountText)) {
      await ctx.reply(
        "⚠️ Invalid amount format. Please enter a valid amount:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    // Convert to smallest unit (USDC uses 8 decimal places in this system)
    const amount = parseFloat(amountText);
    const amountInSmallestUnit = Math.round(amount * 100000000).toString();

    // Update session with amount
    transferSession.amount = amountInSmallestUnit;
    transferSession.step = TransferStep.SEND_PURPOSE;
    transferSession.currency = Currency.USDC; // Default to USDC
    await this.sessionManager.updateSession(userId, { transferSession });

    await ctx.reply(
      `💰 Amount set to: *${amountText} USDC*\n\n` +
        "Please select the purpose of this transfer:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Gift 🎁", "purpose_gift"),
            Markup.button.callback("Personal 👤", "purpose_self"),
          ],
          [
            Markup.button.callback("Family Support 👪", "purpose_family"),
            Markup.button.callback("Reimbursement 💵", "purpose_reimbursement"),
          ],
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
    return true;
  }

  /**
   * Handle purpose selection from inline keyboard
   */
  async handlePurposeCallback(ctx: Context, purposeChoice: string) {
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

      // Map callback to purpose code
      switch (purposeChoice) {
        case "purpose_gift":
          purposeCode = PurposeCode.GIFT;
          break;
        case "purpose_self":
          purposeCode = PurposeCode.SELF;
          break;
        case "purpose_family":
          purposeCode = PurposeCode.FAMILY;
          break;
        case "purpose_reimbursement":
          purposeCode = PurposeCode.REIMBURSEMENT;
          break;
        default:
          await ctx.reply("Invalid selection. Please try again.");
          return;
      }

      // Update session with purpose code
      transferSession.purposeCode = purposeCode;
      transferSession.sourceOfFunds = SourceOfFunds.SAVINGS; // Default source of funds

      // Determine next step based on current flow
      if (
        transferSession.recipientEmail ||
        transferSession.recipientWalletAddress
      ) {
        transferSession.step = TransferStep.SEND_CONFIRMATION;
      } else if (transferSession.step === TransferStep.WITHDRAW_PURPOSE) {
        transferSession.step = TransferStep.WITHDRAW_CONFIRMATION;
      }

      await this.sessionManager.updateSession(userId, { transferSession });

      // Format amount for display
      const amountValue = parseInt(transferSession.amount!, 10);
      const formattedAmount = (amountValue / 100000000).toFixed(2);

      // Build confirmation message
      let confirmationMessage =
        "📋 *Please confirm the transaction details:*\n\n";

      if (transferSession.step === TransferStep.SEND_CONFIRMATION) {
        confirmationMessage += `💰 *Amount:* ${formattedAmount} ${transferSession.currency?.toUpperCase()}\n`;
        confirmationMessage += `🔍 *Purpose:* ${purposeCode}\n`;

        if (transferSession.recipientEmail) {
          confirmationMessage += `📧 *Recipient:* ${transferSession.recipientEmail}\n`;
        } else if (transferSession.recipientWalletAddress) {
          confirmationMessage += `🔑 *Recipient:* \`${transferSession.recipientWalletAddress.substring(0, 8)}...${transferSession.recipientWalletAddress.substring(transferSession.recipientWalletAddress.length - 8)}\`\n`;
        }
      } else if (transferSession.step === TransferStep.WITHDRAW_CONFIRMATION) {
        confirmationMessage += `💰 *Amount:* ${formattedAmount} ${transferSession.currency?.toUpperCase()}\n`;
        confirmationMessage += `🔍 *Purpose:* ${purposeCode}\n`;
        confirmationMessage += `🔑 *Destination:* \`${transferSession.recipientWalletAddress?.substring(0, 8)}...${transferSession.recipientWalletAddress?.substring(transferSession.recipientWalletAddress.length - 8)}\`\n`;
      }

      await ctx.reply(confirmationMessage, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback("Confirm ✅", "confirm_transfer"),
            Markup.button.callback("Cancel ❌", "cancel_transfer"),
          ],
        ]),
      });
    } catch (error) {
      this.logger.error(`Error handling purpose selection: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle withdraw wallet address input
   */
  private async handleWithdrawWalletAddressInput(
    ctx: Context,
    walletAddress: string,
    transferSession: TransferSessionData
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    if (!walletAddress || walletAddress.trim().length < 10) {
      await ctx.reply(
        "⚠️ Invalid wallet address. Please enter a valid wallet address:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
      return true;
    }

    // Update session with wallet address
    transferSession.recipientWalletAddress = walletAddress;
    transferSession.step = TransferStep.WITHDRAW_AMOUNT;
    await this.sessionManager.updateSession(userId, { transferSession });

    await ctx.reply(
      `💼 Withdrawal address set to: \`${walletAddress}\`\n\n` +
        "Please enter the amount to withdraw (in USDC):",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ]),
      }
    );
    return true;
  }

  /**
   * Handle confirmation callback for transfers
   */
  async handleConfirmTransferCallback(ctx: Context) {
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

      if (transferSession.step === TransferStep.SEND_CONFIRMATION) {
        await this.processSendTransfer(
          ctx,
          transferSession,
          session.accessToken
        );
      } else if (transferSession.step === TransferStep.WITHDRAW_CONFIRMATION) {
        await this.processWithdrawTransfer(
          ctx,
          transferSession,
          session.accessToken
        );
      } else {
        await ctx.reply("Invalid transfer state. Please try again.");
        await this.sessionManager.updateSession(userId, {
          transferSession: null,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error handling transfer confirmation: ${error.message}`
      );
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Process send transfer
   */
  private async processSendTransfer(
    ctx: Context,
    transferSession: TransferSessionData,
    accessToken: string
  ) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.reply("⏳ Processing your transaction...");

      const sendTransferDto: CreateSendTransferDto = {
        amount: transferSession.amount!,
        purposeCode: transferSession.purposeCode!,
        currency: transferSession.currency!,
      };

      if (transferSession.recipientEmail) {
        sendTransferDto.email = transferSession.recipientEmail;
      } else if (transferSession.recipientWalletAddress) {
        sendTransferDto.walletAddress = transferSession.recipientWalletAddress;
      }

      const result = await this.transferService.sendFunds(
        accessToken,
        sendTransferDto
      );
      if (result) {
        const amountValue = parseInt(transferSession.amount!, 10);
        const formattedAmount = (amountValue / 100000000).toFixed(2);

        let recipientInfo =
          transferSession.recipientEmail ||
          `${transferSession.recipientWalletAddress?.substring(0, 8)}...${transferSession.recipientWalletAddress?.substring(transferSession.recipientWalletAddress.length - 8)}`;

        await ctx.reply(
          "✅ *Transaction Submitted Successfully!*\n\n" +
            `*Amount:* ${formattedAmount} ${transferSession.currency?.toUpperCase()}\n` +
            `*Recipient:* ${recipientInfo}\n` +
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
          "❌ Transaction failed to process. Please try again later or contact support.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "menu_send")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error processing send transfer: ${error.message}`);
      await ctx.reply(
        `❌ ${error.message}. Please try again later.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }

    await this.sessionManager.updateSession(userId, { transferSession: null });
  }

  /**
   * Process withdraw transfer
   */
  private async processWithdrawTransfer(
    ctx: Context,
    transferSession: TransferSessionData,
    accessToken: string
  ) {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      await ctx.reply("⏳ Processing your withdrawal...");

      const withdrawTransferDto: CreateWalletWithdrawTransferDto = {
        walletAddress: transferSession.recipientWalletAddress!,
        amount: transferSession.amount!,
        purposeCode: transferSession.purposeCode!,
        currency: transferSession.currency!,
      };

      const result = await this.transferService.withdrawToWallet(
        accessToken,
        withdrawTransferDto
      );

      if (result) {
        const amountValue = parseInt(transferSession.amount!, 10);
        const formattedAmount = (amountValue / 100000000).toFixed(2);

        await ctx.reply(
          "✅ *Withdrawal Submitted Successfully!*\n\n" +
            `*Amount:* ${formattedAmount} ${transferSession.currency?.toUpperCase()}\n` +
            `*Destination:* \`${transferSession.recipientWalletAddress?.substring(0, 8)}...${transferSession.recipientWalletAddress?.substring(transferSession.recipientWalletAddress.length - 8)}\`\n` +
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
          "❌ Withdrawal failed to process. Please try again later or contact support.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_withdraw")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error processing withdrawal: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while processing your withdrawal. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }

    await this.sessionManager.updateSession(userId, { transferSession: null });
  }

  /**
   * Handle transfer input with support for inline keyboards
   */
  async handleTransferInput(
    ctx: Context,
    messageText: string
  ): Promise<boolean> {
    const userId = ctx.from?.id;
    if (!userId) return false;

    const session = await this.sessionManager.getSession(userId);

    if (!session || !session.transferSession || !session.accessToken) {
      return false;
    }

    try {
      const transferSession = session.transferSession as TransferSessionData;

      if (
        transferSession.step === TransferStep.BANK_WITHDRAW_AMOUNT ||
        transferSession.step === TransferStep.BANK_WITHDRAW_COUNTRY ||
        transferSession.step === TransferStep.BANK_WITHDRAW_PURPOSE ||
        transferSession.step === TransferStep.BANK_WITHDRAW_CONFIRMATION
      ) {
        return this.bankWithdrawHandler.handleBankWithdrawInput(
          ctx,
          messageText,
          transferSession,
          session.accessToken
        );
      }

      switch (transferSession.step) {
        case TransferStep.SEND_EMAIL_RECIPIENT:
          return await this.handleSendEmailRecipientInput(
            ctx,
            messageText,
            transferSession
          );

        case TransferStep.SEND_WALLET_RECIPIENT:
          return await this.handleSendWalletRecipientInput(
            ctx,
            messageText,
            transferSession
          );

        case TransferStep.SEND_AMOUNT:
        case TransferStep.WITHDRAW_AMOUNT:
          return await this.handleAmountInput(
            ctx,
            messageText,
            transferSession
          );

        case TransferStep.WITHDRAW_WALLET_ADDRESS:
          return await this.handleWithdrawWalletAddressInput(
            ctx,
            messageText,
            transferSession
          );

        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Error handling transfer input: ${error.message}`);

      await ctx.reply(
        "An error occurred while processing your input. Please try again.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return true;
    }
  }
}
