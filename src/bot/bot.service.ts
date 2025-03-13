import { Injectable, Logger } from "@nestjs/common";
import { Telegraf, Context } from "telegraf";
import { AuthService } from "../auth/auth.service";
import { LoginEmailOtpRequestDto } from "../auth/dto/login-email-otp-request.dto";
import { VerifyEmailOtpRequestDto } from "../auth/dto/verify-email-otp-request.dto";
import {
  AuthStep,
  SessionData,
  UserSession,
} from "./interfaces/session.interface";
import { KycService } from "../kyc/kyc.service";
import { WalletService } from "../wallet/wallet.service";

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Telegraf;
  private readonly sessions: SessionData = {};
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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
    this.setupCommands();
    this.setupMessageHandlers();
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
      setInterval(() => this.cleanupSessions(), 5 * 60 * 1000); // Check every 5 minutes
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
   * Set up bot commands
   */
  private setupCommands() {
    this.bot.command("start", this.handleStartCommand.bind(this));
    this.bot.command("help", this.handleHelpCommand.bind(this));
    this.bot.command("login", this.handleLoginCommand.bind(this));
    this.bot.command("logout", this.handleLogoutCommand.bind(this));
    this.bot.command("profile", this.handleProfileCommand.bind(this));
    this.bot.command("kyc", this.handleKycStatusCommand.bind(this));

    // Wallet Management Commands
    this.bot.command("wallets", this.handleWalletsCommand.bind(this));
    this.bot.command("balance", this.handleBalanceCommand.bind(this));
    this.bot.command(
      "setdefault",
      this.handleSetDefaultWalletCommand.bind(this)
    );
    this.bot.command(
      "defaultwallet",
      this.handleDefaultWalletCommand.bind(this)
    );
  }

  /**
   * Set up message handlers
   */
  private setupMessageHandlers() {
    this.bot.on("text", this.handleMessage.bind(this));
  }

  /**
   * Handle start command
   */
  private async handleStartCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;
    this.resetSession(userId);

    await ctx.reply(
      "Welcome to Copperx Telegram Bot! 👋\n\n" +
        "Use /login to authenticate with your Copperx account.\n" +
        "Use /help to see available commands."
    );
  }

  /**
   * Handle help command
   */
  private async handleHelpCommand(ctx: Context) {
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

  /**
   * Handle login command
   */
  private async handleLoginCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if already authenticated
    if (this.isAuthenticated(userId)) {
      await ctx.reply(
        "You are already logged in. Use /logout to end your session."
      );
      return;
    }

    // Initialize or update session
    this.updateSession(userId, {
      step: AuthStep.WAITING_FOR_EMAIL,
      lastActivity: new Date(),
    });

    await ctx.reply("Please enter your email address:");
  }

  /**
   * Handle logout command
   */
  private async handleLogoutCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    if (
      this.sessions[userId] &&
      this.sessions[userId].step === AuthStep.AUTHENTICATED
    ) {
      this.resetSession(userId);
      await ctx.reply("You have been logged out successfully.");
    } else {
      await ctx.reply("You are not currently logged in.");
    }
  }

  /**
   * Handle profile command - Get user profile
   */
  private async handleProfileCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your profile. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply("Fetching your profile information...");

      // Get user profile using the /me endpoint
      const userInfo = await this.authService.getAuthUser(session.accessToken);

      // Format the response
      const profileMessage = [
        "🧑‍💼 User Profile",
        "",
        `Email: ${userInfo.email}`,
        `Name: ${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim(),
        `Role: ${userInfo.role || "User"}`,
        `Status: ${userInfo.status || "Not set"}`,
        `Profile Type: ${userInfo.type || "Not set"}`,
        `Wallet Address: ${userInfo.walletAddress || "Not connected"}`,
      ].join("\n");

      await ctx.reply(profileMessage);
    } catch (error) {
      this.logger.error(`Error fetching profile: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your profile information. Please try again later."
      );
    }
  }

  /**
   * Handle KYC status command - Get KYC status
   */
  private async handleKycStatusCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to check KYC status. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply("Checking your KYC status...");

      // Get KYC status using the KYC service
      const kycResponse = await this.kycService.getKycStatus(
        session.accessToken
      );

      if (kycResponse && kycResponse.data && kycResponse.data.length > 0) {
        // User has KYC records
        const latestKyc = kycResponse.data[0]; // Assuming first result is the latest

        const statusEmoji = this.kycService.getStatusEmoji(latestKyc.status);
        const profileType = this.kycService.formatProfileType(latestKyc.type);
        const statusDesc = this.kycService.getStatusDescription(
          latestKyc.status
        );
        const timeEstimate = this.kycService.getEstimatedTimeToCompletion(
          latestKyc.status
        );
        const nextSteps = this.kycService.getNextSteps(
          latestKyc.status,
          latestKyc.type
        );

        // Build the base KYC message
        let kycMessage = [
          `🪪 KYC Status: ${statusEmoji} ${latestKyc.status.toUpperCase()}`,
          "",
          `${statusDesc}`,
          `${timeEstimate}`,
          "",
          `Profile Type: ${profileType}`,
          `Verification Provider: ${latestKyc.kycProviderCode || "Not specified"}`,
          `Submitted: ${new Date(latestKyc.createdAt).toLocaleString() || "Unknown"}`,
          latestKyc.updatedAt
            ? `Last Updated: ${new Date(latestKyc.updatedAt).toLocaleString()}`
            : "",
        ]
          .filter((line) => line !== "")
          .join("\n");

        // Add details based on profile type
        if (
          latestKyc.type.toLowerCase() === "individual" &&
          latestKyc.kycDetail
        ) {
          const kycDetail = latestKyc.kycDetail;
          const detailsMessage = [
            "",
            "👤 Individual Details:",
            `Name: ${kycDetail.firstName || ""} ${kycDetail.middleName || ""} ${kycDetail.lastName || ""}`
              .trim()
              .replace(/\s+/g, " "),
            kycDetail.email ? `Email: ${kycDetail.email}` : "",
            kycDetail.phoneNumber ? `Phone: ${kycDetail.phoneNumber}` : "",
            kycDetail.nationality
              ? `Nationality: ${kycDetail.nationality}`
              : "",
            kycDetail.country ? `Country: ${kycDetail.country}` : "",

            // Only add document information if available
            kycDetail.kycDocuments && kycDetail.kycDocuments.length > 0
              ? "\n📄 Documents:" +
                kycDetail.kycDocuments
                  .map((doc) => `\n- ${doc.documentType}: ${doc.status}`)
                  .join("")
              : "",
          ]
            .filter((line) => line !== "")
            .join("\n");

          kycMessage += detailsMessage;
        } else if (
          latestKyc.type.toLowerCase() === "business" &&
          latestKyc.kybDetail
        ) {
          const kybDetail = latestKyc.kybDetail;
          const detailsMessage = [
            "",
            "🏢 Business Details:",
            `Company: ${kybDetail.companyName || "Not specified"}`,
            kybDetail.companyType ? `Type: ${kybDetail.companyType}` : "",
            kybDetail.incorporationCountry
              ? `Incorporation Country: ${kybDetail.incorporationCountry}`
              : "",
            kybDetail.website ? `Website: ${kybDetail.website}` : "",
            kybDetail.email ? `Email: ${kybDetail.email}` : "",
            kybDetail.phoneNumber ? `Phone: ${kybDetail.phoneNumber}` : "",

            // Only add document information if available
            kybDetail.kybDocuments && kybDetail.kybDocuments.length > 0
              ? "\n📄 Documents:" +
                kybDetail.kybDocuments
                  .map((doc) => `\n- ${doc.documentType}: ${doc.status}`)
                  .join("")
              : "",
          ]
            .filter((line) => line !== "")
            .join("\n");

          kycMessage += detailsMessage;
        }

        // Add next steps
        kycMessage += `\n\n⏭️ Next Steps:\n${nextSteps}`;

        // Add rejection reason if available
        if (
          latestKyc.status.toLowerCase() === "rejected" &&
          latestKyc.statusUpdates
        ) {
          kycMessage += `\n\n❗ Rejection Reason:\n${latestKyc.statusUpdates}`;
        }

        await ctx.reply(kycMessage);
      } else {
        // No KYC records found
        await ctx.reply(
          "📋 You haven't started the KYC process yet.\n\n" +
            "Please complete your KYC verification on the Copperx platform to access all features."
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching KYC status: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your KYC status. Please try again later."
      );
    }
  }

  /**
   * Handle wallets command - List all wallets
   */
  private async handleWalletsCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your wallets. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply("Fetching your wallets...");

      // Get wallets using the wallet service
      const wallets = await this.walletService.getWallets(session.accessToken);

      if (wallets && wallets.length > 0) {
        // Format wallet list
        let walletsMessage = "💼 Your Wallets:\n\n";

        wallets.forEach((wallet, index) => {
          const networkName = this.walletService.formatNetworkName(
            wallet.network
          );
          const formattedAddress = this.walletService.formatWalletAddress(
            wallet.walletAddress
          );

          walletsMessage += `${index + 1}. ${networkName} ${wallet.isDefault ? "✅" : ""}\n`;
          walletsMessage += `   Address: ${formattedAddress}\n`;
          walletsMessage += `   Wallet ID: ${wallet.id}\n`;
        });

        walletsMessage +=
          "To set a wallet as default, use /setdefault followed by the wallet ID.";

        await ctx.reply(walletsMessage);
      } else {
        await ctx.reply(
          "You don't have any wallets yet. Please create a wallet on the Copperx platform."
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching wallets: ${error.message}`);
      await ctx.reply("Failed to fetch your wallets. Please try again later.");
    }
  }

  /**
   * Handle balance command - View all wallet balances
   */
  private async handleBalanceCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your balances. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply("Fetching your wallet balances...");

      // Get wallet balances using the wallet service
      const walletBalances = await this.walletService.getWalletBalances(
        session.accessToken
      );

      if (walletBalances && walletBalances.length > 0) {
        // Format balances by wallet
        let balancesMessage = "💰 Your Wallet Balances:\n\n";

        walletBalances.forEach((walletBalance, index) => {
          const networkName = this.walletService.formatNetworkName(
            walletBalance.network
          );

          balancesMessage += `${index + 1}. ${walletBalance.isDefault ? "✓ " : ""}${networkName}\n`;

          if (walletBalance.balances && walletBalance.balances.length > 0) {
            walletBalance.balances.forEach((balance) => {
              balancesMessage += `   ${balance.symbol}: ${balance.balance}\n`;
            });
          } else {
            balancesMessage += "   No token balances found\n";
          }

          balancesMessage += "\n";
        });

        await ctx.reply(balancesMessage);
      } else {
        await ctx.reply(
          "No wallet balances found. Please ensure you have wallets set up on the Copperx platform."
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching balances: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your wallet balances. Please try again later."
      );
    }
  }

  /**
   * Handle default wallet command - Show default wallet info
   */
  private async handleDefaultWalletCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your default wallet. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply("Fetching your default wallet...");

      // Get default wallet using the wallet service
      const defaultWallet = await this.walletService.getDefaultWallet(
        session.accessToken
      );

      if (defaultWallet) {
        const networkName = this.walletService.formatNetworkName(
          defaultWallet.network
        );
        const formattedAddress = this.walletService.formatWalletAddress(
          defaultWallet.walletAddress
        );

        const walletMessage = [
          "✅ Default Wallet",
          "",
          `Network: ${networkName}`,
          `Address: ${formattedAddress}`,
          `Wallet ID: ${defaultWallet.id}`,
          `Created: ${new Date(defaultWallet.createdAt).toLocaleDateString()}`,
          "",
          "This wallet will be used for all transactions unless specified otherwise.",
        ].join("\n");

        await ctx.reply(walletMessage);
      } else {
        await ctx.reply(
          "You don't have a default wallet set. Use /setdefault to set a default wallet."
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching default wallet: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your default wallet. Please try again later."
      );
    }
  }

  /**
   * Handle set default wallet command
   */
  private async handleSetDefaultWalletCommand(ctx: Context) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;
    const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
    const parts = text.split(" ");

    // Check if wallet ID was provided
    if (parts.length < 2) {
      await ctx.reply(
        "Please provide a wallet ID. Usage: /setdefault WALLET_ID\n\n" +
          "You can get the wallet ID by using the /wallets command."
      );
      return;
    }

    const walletId = parts[1].trim();

    // Check if authenticated
    if (!this.isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to set a default wallet. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = this.getSession(userId);
      if (!session || !session.accessToken) {
        await ctx.reply("Authentication error. Please /login again.");
        return;
      }

      await ctx.reply(`Setting wallet ${walletId} as your default wallet...`);

      // Set default wallet using the wallet service
      const updatedWallet = await this.walletService.setDefaultWallet(
        session.accessToken,
        walletId
      );

      if (updatedWallet) {
        const networkName = this.walletService.formatNetworkName(
          updatedWallet.network
        );
        const formattedAddress = this.walletService.formatWalletAddress(
          updatedWallet.walletAddress
        );

        const successMessage = [
          "✅ Default Wallet Updated",
          "",
          `Network: ${networkName}`,
          `Address: ${formattedAddress}`,
          `Wallet ID: ${updatedWallet.id}`,
          "",
          "This wallet will now be used for all transactions unless specified otherwise.",
        ].join("\n");

        await ctx.reply(successMessage);
      } else {
        await ctx.reply(
          "Failed to set default wallet. Please check the wallet ID and try again."
        );
      }
    } catch (error) {
      this.logger.error(`Error setting default wallet: ${error.message}`);
      await ctx.reply(
        "Failed to set your default wallet. Please check the wallet ID and try again later."
      );
    }
  }

  /**
   * Handle text messages based on current session state
   */
  private async handleMessage(ctx: Context) {
    if (!ctx.message || !("text" in ctx.message)) return;

    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;
    const messageText = ctx.message.text;

    // Ignore commands
    if (messageText.startsWith("/")) return;

    const session = this.getSession(userId);
    if (!session) {
      await ctx.reply("Please use /login to start authentication.");
      return;
    }

    // Update last activity
    this.updateSessionActivity(userId);

    // Handle based on current step
    switch (session.step) {
      case AuthStep.WAITING_FOR_EMAIL:
        await this.handleEmailInput(ctx, userId, messageText);
        break;

      case AuthStep.WAITING_FOR_OTP:
        await this.handleOtpInput(ctx, userId, messageText);
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

  /**
   * Handle email input
   */
  private async handleEmailInput(ctx: Context, userId: number, email: string) {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply("Please enter a valid email address:");
      return;
    }

    try {
      // Request OTP
      await ctx.reply("Sending OTP to your email...");

      const dto: LoginEmailOtpRequestDto = { email };
      const response = await this.authService.requestEmailOtp(dto);

      if (response) {
        // Update session
        this.updateSession(userId, {
          step: AuthStep.WAITING_FOR_OTP,
          email,
          sid: response.sid,
          lastActivity: new Date(),
        });

        await ctx.reply("Please enter the OTP sent to your email:");
      } else {
        await ctx.reply(
          "Failed to send OTP. Please try again later or contact support."
        );
      }
    } catch (error) {
      this.logger.error(`Error requesting OTP: ${error.message}`);
      await ctx.reply(
        "An error occurred while requesting OTP. Please try again later."
      );
    }
  }

  /**
   * Handle OTP input
   */
  private async handleOtpInput(ctx: Context, userId: number, otp: string) {
    const session = this.getSession(userId);

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      await ctx.reply("Please enter a valid 6-digit OTP:");
      return;
    }

    try {
      // Verify OTP
      await ctx.reply("Verifying OTP...");

      const dto: VerifyEmailOtpRequestDto = {
        email: session?.email || "",
        otp,
        sid: session?.sid || "",
      };

      const authResponse = await this.authService.verifyEmailOtp(dto);

      if (authResponse.accessToken) {
        // Update session with token
        this.updateSession(userId, {
          step: AuthStep.AUTHENTICATED,
          accessToken: authResponse.accessToken,
          expireAt: authResponse.expireAt,
          lastActivity: new Date(),
        });

        // Get user information
        const userInfo = await this.authService.getAuthUser(
          authResponse.accessToken
        );

        await ctx.reply(
          `✅ Authentication successful!\n\n` +
            `Welcome ${userInfo.firstName || userInfo.email}!\n\n` +
            `Email: ${userInfo.email}\n` +
            `KYC Status: ${userInfo.status || "Not started"}` +
            `\n\nUse /profile to see your full profile or /kyc to check your KYC status.`
        );
      } else {
        await ctx.reply("Authentication failed. Please try again.");
      }
    } catch (error) {
      this.logger.error(`Error verifying OTP: ${error.message}`);
      await ctx.reply(
        "Failed to verify OTP. Please check your code and try again."
      );
    }
  }

  /**
   * Get user session
   */
  private getSession(userId: number): UserSession | null {
    return this.sessions[userId] || null;
  }

  /**
   * Update user session
   */
  private updateSession(userId: number, sessionData: Partial<UserSession>) {
    this.sessions[userId] = {
      ...this.sessions[userId],
      ...sessionData,
    };
  }

  /**
   * Update session last activity timestamp
   */
  private updateSessionActivity(userId: number) {
    if (this.sessions[userId]) {
      this.sessions[userId].lastActivity = new Date();
    }
  }

  /**
   * Reset user session
   */
  private resetSession(userId: number) {
    delete this.sessions[userId];
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(userId: number): boolean {
    const session = this.getSession(userId);

    if (!session || session.step !== AuthStep.AUTHENTICATED) {
      return false;
    }

    // Check if token is expired
    if (session.expireAt && new Date() > new Date(session.expireAt)) {
      this.resetSession(userId);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupSessions() {
    const now = new Date().getTime();

    Object.keys(this.sessions).forEach((key) => {
      const userId = parseInt(key);
      const session = this.sessions[userId];
      const lastActivity = session.lastActivity.getTime();

      // Remove sessions that have been inactive for the timeout period
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.logger.debug(`Cleaning up expired session for user ${userId}`);
        this.resetSession(userId);
      }
    });
  }
}
