import { Context } from "telegraf";
import { Logger } from "@nestjs/common";
import { AuthStep } from "./interfaces/session.interface";
import { AuthCommandHandler } from "./handlers/auth-command.handler";

export class MessageHandler {
  private readonly logger = new Logger(MessageHandler.name);

  constructor(private readonly authCommandHandler: AuthCommandHandler) {}

  /**
   * Handle text messages based on current session state
   */
  async handleMessage(
    ctx: Context,
    getSession: Function,
    updateSessionActivity: Function,
    updateSession: Function
  ) {
    if (!ctx.message || !("text" in ctx.message)) return;

    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    // Ignore commands
    if (messageText.startsWith("/")) return;

    const session = getSession(userId);
    if (!session) {
      await ctx.reply("Please use /login to start authentication.");
      return;
    }

    // Update last activity
    updateSessionActivity(userId);

    // Handle based on current step
    switch (session.step) {
      case AuthStep.WAITING_FOR_EMAIL:
        await this.authCommandHandler.handleEmailInput(
          ctx,
          userId,
          messageText,
          updateSession
        );
        break;

      case AuthStep.WAITING_FOR_OTP:
        await this.authCommandHandler.handleOtpInput(
          ctx,
          userId,
          messageText,
          getSession,
          updateSession
        );
        break;

      case AuthStep.AUTHENTICATED:
        await ctx.reply(
          "You are already authenticated. Use /logout to end your session."
        );
        break;

      default:
        await ctx.reply("Please use /login to start authentication.");
    }
  }
}
