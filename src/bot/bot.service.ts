import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Telegraf } from "telegraf";
import { WalletCommandHandler } from "./handlers/wallet-command.handler";
import { AuthCommandHandler } from "./handlers/auth-command.handler";
import { KycCommandHandler } from "./handlers/kyc-command.handler";
import { BasicCommandHandler } from "./handlers/basic-command.handler";
import { TransferCommandHandler } from "./handlers/transfer-command.handler";
import { SessionManager } from "./session-manager";
import { MessageHandler } from "./message-handler";
import { BankWithdrawHandler } from "./handlers/bank-withdraw.handler";
import { CallbackQueryHandler } from "./handlers/callback-query.handler";
import {
  AuthenticatedContext,
  createAuthMiddleware,
} from "src/auth-middleware";

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Telegraf;

  constructor(
    private readonly basicCommandHandler: BasicCommandHandler,
    private readonly authCommandHandler: AuthCommandHandler,
    private readonly kycCommandHandler: KycCommandHandler,
    private readonly walletCommandHandler: WalletCommandHandler,
    private readonly transferCommandHandler: TransferCommandHandler,
    private readonly bankWithdrawHandler: BankWithdrawHandler,
    private readonly callbackQueryHandler: CallbackQueryHandler,
    private readonly messageHandler: MessageHandler,
    private readonly sessionManager: SessionManager
  ) {
    // Initialize bot with token from environment variables
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined");
    }
    this.bot = new Telegraf(token);
  }

  /**
   * Called when the module is initialized
   */
  async onModuleInit() {
    this.logger.log("Initializing Telegram bot...");
    try {
      this.applyMiddleware();
      this.registerCommands();
      this.registerMessageHandlers();
      this.registerCallbackHandlers();

      await this.startBot();
      this.logger.log("Telegram bot initialized successfully");
    } catch (error) {
      this.logger.error(`Failed to initialize Telegram bot: ${error.message}`);
    }
  }

  /**
   * Called when the module is being destroyed
   */
  async onModuleDestroy() {
    this.logger.log("Shutting down Telegram bot...");
    await this.stopBot();
    this.logger.log("Telegram bot shut down successfully");
  }

  /**
   * Start the Telegram bot
   */
  private async startBot() {
    try {
      this.logger.log("Starting Telegram bot...");
      await this.bot.launch();
      this.logger.log("Telegram bot started successfully");

      this.sessionManager.startCleanupInterval();
    } catch (error) {
      this.logger.error(`Failed to start Telegram bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the Telegram bot
   */
  private async stopBot() {
    this.logger.log("Stopping Telegram bot...");
    this.bot.stop();
  }

  /**
   * Apply middleware for validating user context
   */
  private applyMiddleware() {
    this.bot.use(async (ctx, next) => {
      if (!ctx.from) {
        await ctx.reply("An error occurred. Please try again.");
        return;
      }
      return next();
    });
  }

  /**
   * Register all bot commands
   */
  private registerCommands() {
    const authMiddleware = createAuthMiddleware(this.sessionManager);

    this.bot.telegram.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "menu", description: "Show main menu" },
      { command: "login", description: "Login to your account" },
      { command: "profile", description: "View your profile" },
      { command: "balance", description: "Check wallet balances" },
      { command: "send", description: "Send funds" },
      { command: "withdraw", description: "Withdraw funds" },
      { command: "transfers", description: "View recent transfers" },
      { command: "help", description: "Get help" },
      { command: "notifications", description: "Manage notifications" },
      { command: "kyc", description: "Check KYC status" },
    ]);

    this.bot.command("start", async (ctx) => {
      await this.sessionManager.resetSession(ctx.from!.id);
      await this.basicCommandHandler.handleStartCommand(ctx);
    });

    this.bot.command("menu", async (ctx) => {
      await this.basicCommandHandler.showMainMenu(ctx);
    });

    this.bot.command("help", (ctx) => {
      this.basicCommandHandler.handleHelpCommand(ctx);
    });

    // Auth commands
    this.bot.command("login", async (ctx) => {
      await this.authCommandHandler.handleLoginCommand(ctx);
    });

    this.bot.command("logout", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.authCommandHandler.handleLogoutCommand(authCtx);
    });

    this.bot.command("profile", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.authCommandHandler.handleProfileCommand(authCtx);
    });

    // KYC command
    this.bot.command("kyc", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.kycCommandHandler.handleKycStatusCommand(authCtx);
    });

    // Wallet Management Commands
    this.bot.command("wallets", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.walletCommandHandler.handleWalletsCommand(authCtx);
    });

    this.bot.command("balance", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.walletCommandHandler.handleWalletBalanceCommand(authCtx);
    });

    this.bot.command("setdefault", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.walletCommandHandler.handleDefaultWalletCommand(authCtx);
    });

    this.bot.command("defaultwallet", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.walletCommandHandler.handleDefaultWalletCommand(authCtx);
    });

    // Transfer commands
    this.bot.command("send", authMiddleware, async (ctx) => {
      await this.transferCommandHandler.handleSendCommand(ctx);
    });

    this.bot.command("withdraw", authMiddleware, async (ctx) => {
      await this.transferCommandHandler.handleWithdrawCommand(ctx);
    });

    this.bot.command("bankwithdraw", authMiddleware, async (ctx) => {
      await this.bankWithdrawHandler.handleBankWithdrawCommand(ctx);
    });

    this.bot.command("transfers", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.transferCommandHandler.handleTransfersCommand(authCtx);
    });

    this.bot.command("notifications", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.basicCommandHandler.handleNotificationsCommand(authCtx);
    });
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers() {
    this.bot.on("text", (ctx) => this.messageHandler.handleMessage(ctx));
  }

  /**
   * Register callback handlers
   */
  private registerCallbackHandlers() {
    this.callbackQueryHandler.registerCallbacks(this.bot);
  }
}
