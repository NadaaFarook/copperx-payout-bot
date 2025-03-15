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
        "💸 Fund Transfers\n" +
        "/send - Send money to email or wallet address\n" +
        "/withdraw - Withdraw funds to wallet address\n" +
        "/bankwithdraw - Withdraw to bank account\n" +
        "/bulksend - Send to multiple recipients\n" +
        "/transfers - List your recent transfers\n\n" +
        "🔔 Notifications\n" +
        "/notifications - Check notification status\n\n" +
        "/help - Show this help message\n\n" +
        "Need more help? Join our community: https://t.me/copperxcommunity/2183"
    );
  }

  /**
   * Handle notifications command
   */
  async handleNotificationsCommand(
    ctx: Context,
    getSession: Function,
    isAuthenticated: Function,
    enableNotifications: Function,
    disableNotifications: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;

    // Check if authenticated
    if (!isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to manage notifications. Use /login to authenticate."
      );
      return;
    }

    const session = getSession(userId);
    if (!session) {
      await ctx.reply("Session error. Please /login again.");
      return;
    }

    // Check command arguments
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.split(" ");
    const action = parts.length > 1 ? parts[1].toLowerCase() : null;

    if (action === "on" || action === "enable") {
      // If notifications are already enabled
      if (session.notificationsEnabled) {
        await ctx.reply("Notifications are already enabled 🔔");
        return;
      }

      // If we have the organization ID, enable notifications
      if (session.organizationId) {
        const sendMessage = async (message: string) => {
          if (ctx.telegram) {
            await ctx.telegram.sendMessage(userId, message, {
              parse_mode: "Markdown",
            });
          }
        };

        enableNotifications(userId, session.organizationId, sendMessage);
        await ctx.reply(
          "Notifications have been enabled 🔔\n\nYou will now receive deposit notifications."
        );
      } else {
        await ctx.reply(
          "Cannot enable notifications: Missing organization information. Please /logout and /login again."
        );
      }
    } else if (action === "off" || action === "disable") {
      // If notifications are already disabled
      if (!session.notificationsEnabled) {
        await ctx.reply("Notifications are already disabled 🔕");
        return;
      }

      disableNotifications(userId);
      await ctx.reply(
        "Notifications have been disabled 🔕\n\nYou will no longer receive deposit notifications."
      );
    } else {
      // Just show current status
      const status = session.notificationsEnabled
        ? "🔔 Notifications are currently *enabled*.\n\nYou will receive notifications for deposits."
        : "🔕 Notifications are currently *disabled*.\n\nYou will not receive notifications for deposits.";

      await ctx.reply(
        `${status}\n\nUse \`/notifications on\` to enable or \`/notifications off\` to disable notifications.`,
        { parse_mode: "Markdown" }
      );
    }
  }
}
