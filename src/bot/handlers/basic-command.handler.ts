import { Context } from "telegraf";

export class BasicCommandHandler {
  /**
   * Handle start command
   */
  async handleStartCommand(ctx: Context, resetSession: Function) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;
    resetSession(userId);

    await ctx.reply(
      "Welcome to Copperx Telegram Bot! 👋\n\n" +
        "Use /login to authenticate with your Copperx account.\n" +
        "Use /help to see available commands."
    );
  }

  /**
   * Handle help command
   */
  async handleHelpCommand(ctx: Context) {
    await ctx.reply(
      "Available commands:\n\n" +
        "🚀 Getting Started\n" +
        "/start - Restart the bot\n" +
        "/login - Authenticate with your Copperx account\n" +
        "/logout - End your current session\n\n" +
        "👤 Profile & KYC\n" +
        "/profile - Get your user profile information\n" +
        "/kyc - Check your KYC status\n\n" +
        "💰 Wallet Management\n" +
        "/wallets - List all your wallets\n" +
        "/balance - View balances across all wallets\n" +
        "/defaultwallet - Show your default wallet\n" +
        "/setdefault - Set your default wallet\n\n" +
        "/help - Show this help message\n\n" +
        "Need more help? Join our community: https://t.me/copperxcommunity/2183"
    );
  }
}
