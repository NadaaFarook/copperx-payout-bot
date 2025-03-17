import { Markup } from "telegraf";
import { Context } from "telegraf";
import { Logger } from "@nestjs/common";

export class BasicCommandHandler {
  private readonly logger = new Logger(BasicCommandHandler.name);

  /**
   * Handle start command with interactive welcome menu
   */
  async handleStartCommand(ctx: Context, resetSession: Function) {
    const userId = ctx.from?.id;
    resetSession(userId);

    await ctx.reply(
      "Welcome to Copperx Telegram Bot! 👋\n\n" +
        "I can help you manage your Copperx account, check balances, send funds, and more.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Login 🔑", "cmd_login")],
        [Markup.button.callback("Help ℹ️", "cmd_help")],
        [Markup.button.url("Visit Copperx Website", "https://copperx.io")],
      ])
    );
  }

  /**
   * Enhanced help command with categorized menu
   */
  async handleHelpCommand(ctx: Context) {
    await ctx.reply(
      "What would you like help with?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Authentication 🔑", "help_auth")],
        [Markup.button.callback("Wallet Management 💼", "help_wallet")],
        [Markup.button.callback("Transfers & Payments 💸", "help_transfers")],
        [Markup.button.callback("KYC & Profile 👤", "help_profile")],
        [Markup.button.callback("All Commands 📋", "help_all")],
      ])
    );
  }

  /**
   * Handle help category selection
   */
  async handleHelpCategoryCallback(ctx: Context, category: string) {
    try {
      await ctx.answerCbQuery();

      let helpText = "";

      switch (category) {
        case "help_auth":
          helpText =
            "🔑 *Authentication Commands*\n\n" +
            "/login - Authenticate with your Copperx account\n" +
            "/logout - End your current session\n\n" +
            "To login, you'll need access to your email for OTP verification.";
          break;

        case "help_wallet":
          helpText =
            "💼 *Wallet Management Commands*\n\n" +
            "/wallets - List all your wallets\n" +
            "/balance - View balances across all wallets\n" +
            "/defaultwallet - Show your default wallet\n" +
            "/setdefault - Set your default wallet\n\n" +
            "Your default wallet will be used for all transactions unless specified otherwise.";
          break;

        case "help_transfers":
          helpText =
            "💸 *Transfer & Payment Commands*\n\n" +
            "/send - Send money to email or wallet address\n" +
            "/withdraw - Withdraw funds to wallet address\n" +
            "/bankwithdraw - Withdraw to bank account\n" +
            "/transfers - List your recent transfers\n\n" +
            "For security reasons, all transactions require confirmation.";
          break;

        case "help_profile":
          helpText =
            "👤 *Profile & KYC Commands*\n\n" +
            "/profile - Get your user profile information\n" +
            "/kyc - Check your KYC status\n" +
            "/notifications - Manage deposit notifications\n\n" +
            "Complete your KYC verification on the Copperx platform to access all features.";
          break;

        case "help_all":
          helpText =
            "📋 *All Available Commands*\n\n" +
            "🚀 *Getting Started*\n" +
            "/start - Restart the bot\n" +
            "/login - Authenticate with your Copperx account\n" +
            "/logout - End your current session\n\n" +
            "👤 *Profile & KYC*\n" +
            "/profile - Get your user profile information\n" +
            "/kyc - Check your KYC status\n\n" +
            "💼 *Wallet Management*\n" +
            "/wallets - List all your wallets\n" +
            "/balance - View balances across all wallets\n" +
            "/defaultwallet - Show your default wallet\n" +
            "/setdefault - Set your default wallet\n\n" +
            "💸 *Fund Transfers*\n" +
            "/send - Send money to email or wallet address\n" +
            "/withdraw - Withdraw funds to wallet address\n" +
            "/bankwithdraw - Withdraw to bank account\n" +
            "/transfers - List your recent transfers\n\n" +
            "🔔 *Notifications*\n" +
            "/notifications - Manage deposit notifications\n\n" +
            "Need more help? Join our community: https://t.me/copperxcommunity/2183";
          break;
      }

      await ctx.reply(helpText, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("« Back to Help Menu", "cmd_help")],
        ]),
      });
    } catch (error) {
      this.logger.error(`Error handling help category: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle notifications command with inline options
   */
  async handleNotificationsCommand(
    ctx: Context,
    isAuthenticated: Function,
    enableNotifications: Function,
    disableNotifications: Function
  ) {
    const userId = ctx.from?.id;
    const { authenticated, session } = await isAuthenticated(userId);

    if (!userId) {
      await ctx.reply("User ID not found. Please try again.");
      return;
    }

    if (!authenticated) {
      await ctx.reply(
        "You need to be logged in to manage notifications. Use /login to authenticate."
      );
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
      // Show current status and options with inline buttons
      const status = session.notificationsEnabled
        ? "🔔 Notifications are currently *enabled*.\n\nYou will receive notifications for deposits."
        : "🔕 Notifications are currently *disabled*.\n\nYou will not receive notifications for deposits.";

      const buttons = [];
      if (session.notificationsEnabled) {
        buttons.push(
          Markup.button.callback(
            "Disable Notifications 🔕",
            "notifications_off"
          )
        );
      } else {
        buttons.push(
          Markup.button.callback("Enable Notifications 🔔", "notifications_on")
        );
      }

      await ctx.reply(status, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([buttons]),
      });
    }
  }

  /**
   * Handle notification toggle from inline buttons
   */
  async handleNotificationCallback(
    ctx: Context,
    action: string,
    getSession: Function,
    enableNotifications: Function,
    disableNotifications: Function
  ) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.reply("User ID not found. Please try again.");
        return;
      }
      const session = await getSession(userId);

      if (!session) {
        await ctx.reply("Session error. Please /login again.");
        return;
      }

      if (action === "notifications_on") {
        if (session.notificationsEnabled) {
          await ctx.reply("Notifications are already enabled 🔔");
          return;
        }

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
      } else if (action === "notifications_off") {
        if (!session.notificationsEnabled) {
          await ctx.reply("Notifications are already disabled 🔕");
          return;
        }

        disableNotifications(userId);
        await ctx.reply(
          "Notifications have been disabled 🔕\n\nYou will no longer receive deposit notifications."
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling notification callback: ${error.message}`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_notifications")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Create main menu with all available options
   */
  async showMainMenu(ctx: Context, isAuthenticated: Function) {
    const isLoggedIn = isAuthenticated(ctx.from?.id);

    // Different buttons based on login status
    const buttons = [];

    if (isLoggedIn) {
      // User is logged in - show full menu
      buttons.push([
        Markup.button.callback("Wallet & Balance 💼", "menu_wallet"),
        Markup.button.callback("Transfer Funds 💸", "menu_transfer"),
      ]);
      buttons.push([
        Markup.button.callback("Profile & KYC 👤", "menu_profile"),
        Markup.button.callback("Notifications 🔔", "cmd_notifications"),
      ]);
      buttons.push([Markup.button.callback("Logout 🔒", "cmd_logout")]);
    } else {
      // User is not logged in - show limited menu
      buttons.push([Markup.button.callback("Login 🔑", "cmd_login")]);
    }

    // Help button for everyone
    buttons.push([Markup.button.callback("Help ℹ️", "cmd_help")]);

    await ctx.reply(
      "📋 *Copperx Bot Main Menu*\n\n" + "Select an option below:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      }
    );
  }

  /**
   * Handle main menu category selection
   */
  async handleMenuCategoryCallback(ctx: Context, category: string) {
    try {
      await ctx.answerCbQuery();

      const buttons = [];
      let menuTitle = "";

      switch (category) {
        case "menu_wallet":
          menuTitle = "💼 *Wallet Management*\n\nSelect an option:";
          buttons.push([
            Markup.button.callback("List Wallets", "cmd_wallets"),
            Markup.button.callback("Check Balance", "cmd_balance"),
          ]);
          buttons.push([
            Markup.button.callback("Default Wallet", "cmd_defaultwallet"),
            Markup.button.callback("Set Default", "menu_setdefault"),
          ]);
          break;

        case "menu_transfer":
          menuTitle = "💸 *Transfer Funds*\n\nSelect an option:";
          buttons.push([
            Markup.button.callback("Send Funds", "menu_send"),
            Markup.button.callback("Withdraw", "cmd_withdraw"),
          ]);
          buttons.push([
            Markup.button.callback("Bank Withdraw", "cmd_bankwithdraw"),
            Markup.button.callback("Recent Transfers", "cmd_transfers"),
          ]);
          break;

        case "menu_profile":
          menuTitle = "👤 *Profile & KYC*\n\nSelect an option:";
          buttons.push([
            Markup.button.callback("View Profile", "cmd_profile"),
            Markup.button.callback("Check KYC Status", "cmd_kyc"),
          ]);
          break;

        case "menu_send":
          menuTitle = "💸 *Send Funds*\n\nHow would you like to send?";
          buttons.push([
            Markup.button.callback("By Email", "send_email"),
            Markup.button.callback("By Wallet Address", "send_wallet"),
          ]);
          break;

        case "menu_setdefault":
          menuTitle =
            "💼 *Set Default Wallet*\n\nUse the command:\n/setdefault WALLET_ID\n\nYou can get your wallet IDs by using the /wallets command.";
          break;
      }

      // Add back button
      buttons.push([Markup.button.callback("« Back to Main Menu", "cmd_menu")]);

      await ctx.reply(menuTitle, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch (error) {
      this.logger.error(`Error handling menu category: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }
}
