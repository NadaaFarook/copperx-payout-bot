import { Context } from "telegraf";
import { Logger } from "@nestjs/common";
import { AuthStep } from "./bot.interface";
import { AuthCommandHandler } from "./handlers/auth-command.handler";
import { TransferCommandHandler } from "./handlers/transfer-command.handler";

export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(
    private readonly authCommandHandler: AuthCommandHandler,
    private readonly transferCommandHandler: TransferCommandHandler
  ) {}

  /**
   * Handle text messages based on current session state
   */
  async handleMessage(
    ctx: Context,
    getSession: Function,
    updateSessionActivity: Function,
    updateSession: Function,
    enableNotifications?: Function
  ) {
    if (!ctx.message || !("text" in ctx.message)) return;

    const userId = ctx.from?.id;
    const messageText = ctx.message.text;

    // Ignore commands
    if (messageText.startsWith("/")) return;

    const session = await getSession(userId);
    if (!session) {
      await ctx.reply("Please use /login to start authentication.");
      return;
    }

    // Update last activity
    await updateSessionActivity(userId);

    // Check if in a transfer flow
    if (session.transferSession) {
      try {
        const handled = await this.transferCommandHandler.handleTransferInput(
          ctx,
          messageText,
          getSession,
          updateSession
        );

        if (handled) return;
      } catch (error) {
        this.logger.error(`Error in transfer flow: ${error.message}`);
        await ctx.reply("An error occurred. Please try again.");
        return;
      }
    }

    // Handle based on current auth step
    switch (session.step) {
      case AuthStep.WAITING_FOR_EMAIL:
        await this.authCommandHandler.handleEmailInput(
          ctx,
          messageText,
          updateSession
        );
        break;

      case AuthStep.WAITING_FOR_OTP:
        await this.authCommandHandler.handleOtpInput(
          ctx,
          messageText,
          getSession,
          updateSession,
          enableNotifications
        );
        break;

      case AuthStep.AUTHENTICATED:
        await ctx.reply(
          "You are authenticated! Use /help to see available commands."
        );
        break;

      default:
        await ctx.reply("Please use /login to start authentication.");
    }
  }
}
