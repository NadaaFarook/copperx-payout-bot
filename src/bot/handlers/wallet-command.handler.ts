import { Context } from "telegraf";
import { Logger } from "@nestjs/common";
import { WalletService } from "src/wallet/wallet.service";

export class WalletCommandHandler {
  private readonly logger = new Logger(WalletCommandHandler.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * Handle wallets command - List all wallets
   */
  async handleWalletsCommand(
    ctx: Context,
    getSession: Function,
    isAuthenticated: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if authenticated
    if (!isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your wallets. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
   * Handle default wallet command - Show default wallet info
   */
  async handleDefaultWalletCommand(
    ctx: Context,
    getSession: Function,
    isAuthenticated: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;

    // Check if authenticated
    if (!isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your default wallet. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
  async handleSetDefaultWalletCommand(
    ctx: Context,
    getSession: Function,
    isAuthenticated: Function
  ) {
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
    if (!isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to set a default wallet. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
   * Handle wallet balance command
   */
  async handleWalletBalanceCommand(
    ctx: Context,
    getSession: Function,
    isAuthenticated: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }

    const userId = ctx.from.id;

    // Check if authenticated
    if (!isAuthenticated(userId)) {
      await ctx.reply(
        "You need to be logged in to view your balances. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
}
