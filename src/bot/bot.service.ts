import { Injectable, Logger } from "@nestjs/common";
import { Telegraf } from "telegraf";
import { AuthService } from "../auth/auth.service";
import { KycService } from "../kyc/kyc.service";
import { WalletService } from "../wallet/wallet.service";
import { NotificationService } from "../notification/notification.service";
import { TransferService } from "../transfer/transfer.service";
import { QuoteService } from "../quote/quote.service";
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
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Telegraf;
  private readonly BasicCommandHandler: BasicCommandHandler;
  private readonly AuthCommandHandler: AuthCommandHandler;
  private readonly KycCommandHandler: KycCommandHandler;
  private readonly WalletCommandHandler: WalletCommandHandler;
  private readonly TransferCommandHandler: TransferCommandHandler;
  private readonly BankWithdrawHandler: BankWithdrawHandler;
  private readonly callbackQueryHandler: CallbackQueryHandler;
  private readonly messageHandler: MessageHandler;

  constructor(
    private readonly authService: AuthService,
    private readonly kycService: KycService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
    private readonly transferService: TransferService,
    private readonly quoteService: QuoteService,
    private readonly sessionManager: SessionManager
  ) {
    // Initialize bot with token from environment variables
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined");
    }
    this.bot = new Telegraf(token);

    this.BasicCommandHandler = new BasicCommandHandler();
    this.AuthCommandHandler = new AuthCommandHandler(authService);
    this.KycCommandHandler = new KycCommandHandler(kycService);
    this.WalletCommandHandler = new WalletCommandHandler(walletService);
    this.BankWithdrawHandler = new BankWithdrawHandler(
      transferService,
      quoteService
    );
    this.TransferCommandHandler = new TransferCommandHandler(
      transferService,
      this.BankWithdrawHandler
    );
    this.callbackQueryHandler = new CallbackQueryHandler(
      this.BasicCommandHandler,
      this.AuthCommandHandler,
      this.KycCommandHandler,
      this.WalletCommandHandler,
      this.TransferCommandHandler,
      this.BankWithdrawHandler
    );
    this.messageHandler = new MessageHandler(
      this.AuthCommandHandler,
      this.TransferCommandHandler
    );

    this.applyMiddleware();

    // Set up bot handlers
    this.registerCommands();
    this.registerMessageHandlers();
    this.registerCallbackHandlers();
  }

  /**
   * Start the Telegram bot
   */
  async startBot() {
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
  async stopBot() {
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
      await this.BasicCommandHandler.handleStartCommand(
        ctx,
        this.sessionManager.resetSession.bind(this.sessionManager)
      );
    });

    this.bot.command("menu", async (ctx) => {
      await this.BasicCommandHandler.showMainMenu(
        ctx,
        async (userId: number) =>
          await this.sessionManager.isAuthenticated(userId)
      );
    });

    this.bot.command("help", (ctx) => {
      this.BasicCommandHandler.handleHelpCommand(ctx);
    });

    // Auth commands
    this.bot.command("login", async (ctx) => {
      await this.AuthCommandHandler.handleLoginCommand(
        ctx,
        this.sessionManager.updateSession.bind(this.sessionManager),
        async () => await this.sessionManager.isAuthenticated(ctx.from!.id)
      );
    });

    this.bot.command("logout", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.AuthCommandHandler.handleLogoutCommand(authCtx);
    });

    this.bot.command("profile", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.AuthCommandHandler.handleProfileCommand(authCtx);
    });

    // KYC command
    this.bot.command("kyc", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.KycCommandHandler.handleKycStatusCommand(authCtx);
    });

    // Wallet Management Commands
    this.bot.command("wallets", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.WalletCommandHandler.handleWalletsCommand(authCtx);
    });

    this.bot.command("balance", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.WalletCommandHandler.handleWalletBalanceCommand(authCtx);
    });

    this.bot.command("setdefault", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.WalletCommandHandler.handleDefaultWalletCommand(authCtx);
    });

    this.bot.command("defaultwallet", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.WalletCommandHandler.handleDefaultWalletCommand(authCtx);
    });

    // Transfer commands
    this.bot.command("send", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.TransferCommandHandler.handleSendCommand(
        ctx,
        authCtx.session.isAuthenticated,
        this.sessionManager.updateSession.bind(this.sessionManager)
      );
    });

    this.bot.command("withdraw", authMiddleware, async (ctx) => {
      await this.TransferCommandHandler.handleWithdrawCommand(ctx);
    });

    this.bot.command("bankwithdraw", authMiddleware, async (ctx) => {
      await this.BankWithdrawHandler.handleBankWithdrawCommand(
        ctx,
        this.sessionManager.updateSession.bind(this.sessionManager)
      );
    });

    this.bot.command("transfers", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.TransferCommandHandler.handleTransfersCommand(authCtx);
    });

    this.bot.command("notifications", authMiddleware, async (ctx) => {
      const authCtx = ctx as unknown as AuthenticatedContext;
      await this.BasicCommandHandler.handleNotificationsCommand(
        authCtx,
        authCtx.session.isAuthenticated,
        this.sessionManager.enableNotifications.bind(this.sessionManager),
        this.sessionManager.disableNotifications.bind(this.sessionManager)
      );
    });
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers() {
    this.bot.on("text", async (ctx) => {
      await this.messageHandler.handleMessage(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.updateSessionActivity.bind(this.sessionManager),
        this.sessionManager.updateSession.bind(this.sessionManager),
        this.sessionManager.enableNotifications.bind(this.sessionManager)
      );
    });
  }

  /**
   * Register callback handlers
   */
  private registerCallbackHandlers() {
    this.callbackQueryHandler.registerCallbacks(this.bot, this.sessionManager);
  }
}
