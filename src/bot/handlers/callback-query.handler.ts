import { Logger } from "@nestjs/common";
import { Context, Markup, Telegraf } from "telegraf";
import { AuthCommandHandler } from "./auth-command.handler";
import { BankWithdrawHandler } from "./bank-withdraw.handler";
import { BasicCommandHandler } from "./basic-command.handler";
import { KycCommandHandler } from "./kyc-command.handler";
import { TransferCommandHandler } from "./transfer-command.handler";
import { WalletCommandHandler } from "./wallet-command.handler";
import { SessionManager } from "../session-manager";
import { handleAuthCheck } from "src/auth-middleware";
import { AuthenticatedContext } from "src/auth-middleware";
import { UserSession } from "../bot.interface";

interface CallbackDefinition {
  pattern: string | RegExp;
  requiresAuth: boolean;
  handler: (
    ctx: Context,
    match?: RegExpExecArray,
    session?: UserSession
  ) => Promise<void>;
  description: string;
}

export class CallbackQueryHandler {
  private readonly logger = new Logger(CallbackQueryHandler.name);

  constructor(
    private readonly basicCommandHandler: BasicCommandHandler,
    private readonly authCommandHandler: AuthCommandHandler,
    private readonly kycCommandHandler: KycCommandHandler,
    private readonly walletCommandHandler: WalletCommandHandler,
    private readonly transferCommandHandler: TransferCommandHandler,
    private readonly bankWithdrawHandler: BankWithdrawHandler
  ) {}

  /**
   * Register all callback handlers
   */
  registerCallbacks(bot: Telegraf, sessionManager: SessionManager) {
    const getSession = async (userId: number) => {
      return await sessionManager.getSession(userId);
    };

    const isAuthenticated = async (userId: number) => {
      return await sessionManager.isAuthenticated(userId);
    };

    const updateSession = async (userId: number, data: any) => {
      await sessionManager.updateSession(userId, data);
    };

    const enableNotifications = async (
      userId: number,
      orgId: string,
      sendMessage: (message: string) => Promise<void>
    ) => {
      await sessionManager.enableNotifications(userId, orgId, sendMessage);
    };

    const disableNotifications = async (userId: number) => {
      await sessionManager.disableNotifications(userId);
    };

    const callbacks: CallbackDefinition[] = [
      // Basic commands
      {
        pattern: "cmd_menu",
        requiresAuth: false,
        handler: async (ctx) =>
          await this.basicCommandHandler.showMainMenu(ctx, isAuthenticated),
        description: "Show main menu",
      },
      {
        pattern: "cmd_help",
        requiresAuth: false,
        handler: async (ctx) =>
          await this.basicCommandHandler.handleHelpCommand(ctx),
        description: "Show help menu",
      },

      // Auth commands
      {
        pattern: "cmd_login",
        requiresAuth: false,
        handler: async (ctx) =>
          await this.authCommandHandler.handleLoginCommand(
            ctx,
            updateSession,
            isAuthenticated
          ),
        description: "Start login process",
      },
      {
        pattern: "cmd_logout",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.authCommandHandler.handleLogoutCommand(authCtx);
        },
        description: "Handle logout",
      },
      {
        pattern: "logout_confirm",
        requiresAuth: false,
        handler: async (ctx) =>
          await this.authCommandHandler.handleLogoutConfirmCallback(
            ctx,
            sessionManager.resetSession.bind(sessionManager)
          ),
        description: "Confirm logout",
      },
      {
        pattern: "cmd_profile",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.authCommandHandler.handleProfileCommand(authCtx);
        },
        description: "Show profile",
      },

      // KYC commands
      {
        pattern: "cmd_kyc",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.kycCommandHandler.handleKycStatusCommand(authCtx);
        },
        description: "Check KYC status",
      },

      // Wallet commands
      {
        pattern: "cmd_wallets",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.walletCommandHandler.handleWalletsCommand(authCtx);
        },
        description: "List wallets",
      },
      {
        pattern: "cmd_balance",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.walletCommandHandler.handleWalletBalanceCommand(authCtx);
        },
        description: "Check wallet balance",
      },
      {
        pattern: "cmd_defaultwallet",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.walletCommandHandler.handleDefaultWalletCommand(authCtx);
        },
        description: "Show default wallet",
      },
      {
        pattern: /^setdefault_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          const walletId = match![1];
          await this.walletCommandHandler.handleSetDefaultWalletCallback(
            authCtx,
            walletId
          );
        },
        description: "Set default wallet",
      },

      // Transfer commands
      {
        pattern: "cmd_withdraw",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.transferCommandHandler.handleWithdrawCommand(authCtx);
        },
        description: "Show withdraw options",
      },
      {
        pattern: "cmd_bankwithdraw",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.bankWithdrawHandler.handleBankWithdrawCommand(
            authCtx,
            updateSession
          );
        },
        description: "Start bank withdrawal process",
      },
      {
        pattern: "cmd_transfers",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.transferCommandHandler.handleTransfersCommand(authCtx);
        },
        description: "List recent transfers",
      },
      {
        pattern: "cmd_notifications",
        requiresAuth: true,
        handler: async (ctx, _, session) => {
          const authCtx = ctx as AuthenticatedContext;
          authCtx.session = session!;
          await this.basicCommandHandler.handleNotificationsCommand(
            ctx,
            isAuthenticated,
            enableNotifications,
            disableNotifications
          );
        },
        description: "Manage notifications",
      },

      // Help category callbacks
      {
        pattern: /^help_(.+)$/,
        requiresAuth: false,
        handler: async (ctx, match) => {
          const category = match![1];
          await this.basicCommandHandler.handleHelpCategoryCallback(
            ctx,
            category
          );
        },
        description: "Show help category",
      },

      // Menu category callbacks
      {
        pattern: /^menu_(.+)$/,
        requiresAuth: false,
        handler: async (ctx, match) => {
          const category = match?.input || "";
          const needsAuth = [
            "menu_wallet",
            "menu_transfer",
            "menu_profile",
            "menu_send",
            "menu_setdefault",
          ].includes(category);

          if (needsAuth) {
            const authCtx = await handleAuthCheck(ctx, sessionManager);
            if (!authCtx) return;
            await this.basicCommandHandler.handleMenuCategoryCallback(
              authCtx,
              category
            );
          } else {
            await this.basicCommandHandler.handleMenuCategoryCallback(
              ctx,
              category
            );
          }
        },
        description: "Handle menu category selection",
      },

      // Send method callbacks
      {
        pattern: /^send_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const method = match?.input || "";
          await this.transferCommandHandler.handleSendMethodCallback(
            ctx,
            method,
            isAuthenticated,
            updateSession
          );
        },
        description: "Handle send method selection",
      },

      // Withdraw method callbacks
      {
        pattern: /^withdraw_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const method = match?.input || "";
          await this.transferCommandHandler.handleWithdrawMethodCallback(
            ctx,
            method,
            isAuthenticated,
            updateSession
          );
        },
        description: "Handle withdraw method selection",
      },

      // Purpose selection callbacks
      {
        pattern: /^purpose_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const purpose = match?.input || "";
          await this.transferCommandHandler.handlePurposeCallback(
            ctx,
            purpose,
            getSession,
            updateSession
          );
        },
        description: "Handle purpose selection",
      },

      // Bank purpose selection callbacks
      {
        pattern: /^bankpurpose_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const purpose = match?.input || "";
          await this.bankWithdrawHandler.handleBankPurposeCallback(
            ctx,
            purpose,
            getSession,
            updateSession
          );
        },
        description: "Handle bank withdrawal purpose selection",
      },

      // Country selection callbacks
      {
        pattern: /^country_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const country = match?.input || "";
          await this.bankWithdrawHandler.handleCountryCallback(
            ctx,
            country,
            getSession,
            updateSession
          );
        },
        description: "Handle country selection",
      },

      // Notification toggle callbacks
      {
        pattern: /^notifications_(.+)$/,
        requiresAuth: true,
        handler: async (ctx, match) => {
          const action = match?.input || "";
          await this.basicCommandHandler.handleNotificationCallback(
            ctx,
            action,
            getSession,
            enableNotifications,
            disableNotifications
          );
        },
        description: "Handle notification toggle",
      },

      // Transfer confirmation callbacks
      {
        pattern: "confirm_transfer",
        requiresAuth: true,
        handler: async (ctx) => {
          await this.transferCommandHandler.handleConfirmTransferCallback(
            ctx,
            getSession,
            updateSession
          );
        },
        description: "Confirm transfer",
      },

      // Bank withdraw confirmation callback
      {
        pattern: "confirm_bankwithdraw",
        requiresAuth: true,
        handler: async (ctx) => {
          await this.bankWithdrawHandler.handleBankWithdrawConfirmCallback(
            ctx,
            getSession,
            updateSession
          );
        },
        description: "Confirm bank withdrawal",
      },

      // Cancel transfer callback
      {
        pattern: "cancel_transfer",
        requiresAuth: false,
        handler: async (ctx) => {
          await this.transferCommandHandler.handleCancelTransferCallback(
            ctx,
            updateSession
          );
        },
        description: "Cancel transfer",
      },
    ];

    callbacks.forEach((callbackDef) => {
      bot.action(callbackDef.pattern, async (ctx) => {
        try {
          await ctx.answerCbQuery();

          if (callbackDef.requiresAuth) {
            const authCtx = await handleAuthCheck(ctx, sessionManager);
            if (!authCtx) return;

            await callbackDef.handler(ctx, ctx.match, authCtx.session);
          } else {
            await callbackDef.handler(ctx, ctx.match);
          }
        } catch (error) {
          this.logger.error(`Error in callback: ${error.message}`);
          await ctx.reply(
            "An error occurred while processing your request. Please try again.",
            Markup.inlineKeyboard([
              [Markup.button.callback("Main Menu", "cmd_menu")],
            ])
          );
        }
      });
    });

    this.logger.log(`Registered ${callbacks.length} callback handlers`);
  }
}
