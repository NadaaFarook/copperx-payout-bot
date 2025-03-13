import { Injectable, Logger } from "@nestjs/common";
import { Telegraf } from "telegraf";
import { AuthService } from "../auth/auth.service";
import { KycService } from "../kyc/kyc.service";
import { WalletService } from "../wallet/wallet.service";
import { WalletCommandHandler } from "./handlers/wallet-command.handler";
import { AuthCommandHandler } from "./handlers/auth-command.handler";
import { KycCommandHandler } from "./handlers/kyc-command.handler";
import { BasicCommandHandler } from "./handlers/basic-command.handler";
import { SessionManager } from "./session-manager";
import { MessageHandler } from "./message-handler";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Telegraf;
  private readonly walletCommandHandler: WalletCommandHandler;
  private readonly authCommandHandler: AuthCommandHandler;
  private readonly kycCommandHandler: KycCommandHandler;
  private readonly basicCommandHandler: BasicCommandHandler;
  private readonly sessionManager: SessionManager;
  private readonly messageHandler: MessageHandler;

  constructor(
    private readonly authService: AuthService,
    private readonly kycService: KycService,
    private readonly walletService: WalletService
  ) {
    // Initialize bot with token from environment variables
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined");
    }
    this.bot = new Telegraf(token);

    // Initialize handlers
    this.sessionManager = new SessionManager();
    this.walletCommandHandler = new WalletCommandHandler(walletService);
    this.authCommandHandler = new AuthCommandHandler(authService);
    this.kycCommandHandler = new KycCommandHandler(kycService);
    this.basicCommandHandler = new BasicCommandHandler();
    this.messageHandler = new MessageHandler(this.authCommandHandler);

    // Set up bot handlers
    this.registerCommands();
    this.registerMessageHandlers();
  }

  /**
   * Start the Telegram bot
   */
  async startBot() {
    try {
      this.logger.log("Starting Telegram bot...");
      await this.bot.launch();
      this.logger.log("Telegram bot started successfully");

      // Start session cleanup interval
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
   * Register all bot commands
   */
  private registerCommands() {
    // Basic commands
    this.bot.command("start", (ctx) =>
      this.basicCommandHandler.handleStartCommand(
        ctx,
        this.sessionManager.resetSession.bind(this.sessionManager)
      )
    );

    this.bot.command("help", (ctx) =>
      this.basicCommandHandler.handleHelpCommand(ctx)
    );

    // Auth commands
    this.bot.command("login", (ctx) =>
      this.authCommandHandler.handleLoginCommand(
        ctx,
        this.sessionManager.updateSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    this.bot.command("logout", (ctx) =>
      this.authCommandHandler.handleLogoutCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.resetSession.bind(this.sessionManager)
      )
    );

    this.bot.command("profile", (ctx) =>
      this.authCommandHandler.handleProfileCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    // KYC command
    this.bot.command("kyc", (ctx) =>
      this.kycCommandHandler.handleKycStatusCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    // Wallet Management Commands
    this.bot.command("wallets", (ctx) =>
      this.walletCommandHandler.handleWalletsCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    this.bot.command("balance", (ctx) =>
      this.walletCommandHandler.handleWalletBalanceCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    this.bot.command("setdefault", (ctx) =>
      this.walletCommandHandler.handleSetDefaultWalletCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );

    this.bot.command("defaultwallet", (ctx) =>
      this.walletCommandHandler.handleDefaultWalletCommand(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.isAuthenticated.bind(this.sessionManager)
      )
    );
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers() {
    this.bot.on("text", (ctx) =>
      this.messageHandler.handleMessage(
        ctx,
        this.sessionManager.getSession.bind(this.sessionManager),
        this.sessionManager.updateSessionActivity.bind(this.sessionManager),
        this.sessionManager.updateSession.bind(this.sessionManager)
      )
    );
  }
}
