import { Markup } from "telegraf";
import { Injectable, Logger } from "@nestjs/common";
import { WalletService } from "src/wallet/wallet.service";
import {
  formatNetworkName,
  formatWalletAddress,
} from "src/common/utils/ui-formatter.util";
import { AuthenticatedContext } from "src/auth-middleware";

@Injectable()
export class WalletCommandHandler {
  private readonly logger = new Logger(WalletCommandHandler.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * Handle wallets command
   */
  async handleWalletsCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("💼 Fetching your wallets...");

      const wallets = await this.walletService.getWallets(
        ctx.session.accessToken
      );

      if (wallets && wallets.length > 0) {
        let walletsMessage = "💼 *Your Wallets:*\n\n";

        wallets.forEach((wallet, index) => {
          const networkName = formatNetworkName(wallet.network);
          const formattedAddress = formatWalletAddress(wallet.walletAddress);

          walletsMessage += `*${index + 1}. ${networkName}* ${wallet.isDefault ? "✅" : ""}\n`;
          walletsMessage += `   *Address:* \`${formattedAddress}\`\n`;
          walletsMessage += `   *Wallet ID:* \`${wallet.id}\`\n\n`;
        });

        const setDefaultButtons = wallets
          .filter((wallet) => !wallet.isDefault)
          .map((wallet) => {
            const networkName = formatNetworkName(wallet.network);
            const label = `Set ${networkName} as Default${wallet.isDefault ? " ✅" : ""}`;
            return [Markup.button.callback(label, `setdefault_${wallet.id}`)];
          });

        setDefaultButtons.push([
          Markup.button.callback("Check Balances", "cmd_balance"),
          Markup.button.callback("Main Menu", "cmd_menu"),
        ]);

        await ctx.reply(walletsMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard(setDefaultButtons),
        });
      } else {
        await ctx.reply(
          "You don't have any wallets yet. Please create a wallet on the Copperx platform.",
          Markup.inlineKeyboard([
            [Markup.button.url("Go to Copperx Platform", "https://copperx.io")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching wallets: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your wallets. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_wallets")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle default wallet command with inline options
   */
  async handleDefaultWalletCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("🔍 Fetching your default wallet...");

      const defaultWallet = await this.walletService.getDefaultWallet(
        ctx.session.accessToken
      );

      if (defaultWallet) {
        const networkName = formatNetworkName(defaultWallet.network);
        const formattedAddress = formatWalletAddress(
          defaultWallet.walletAddress
        );

        const walletMessage = [
          "✅ *Default Wallet*",
          "",
          `*Network:* ${networkName}`,
          `*Address:* \`${formattedAddress}\``,
          `*Wallet ID:* \`${defaultWallet.id}\``,
          `*Created:* ${new Date(defaultWallet.createdAt).toLocaleDateString()}`,
          "",
          "_This wallet will be used for all transactions unless specified otherwise._",
        ].join("\n");

        await ctx.reply(walletMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("Check Balance", "cmd_balance"),
              Markup.button.callback("All Wallets", "cmd_wallets"),
            ],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ]),
        });
      } else {
        await ctx.reply(
          "You don't have a default wallet set.",
          Markup.inlineKeyboard([
            [Markup.button.callback("View All Wallets", "cmd_wallets")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching default wallet: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your wallet balances. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_balance")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle set default wallet from callback
   */
  async handleSetDefaultWalletCallback(
    ctx: AuthenticatedContext,
    walletId: string
  ) {
    try {
      await ctx.answerCbQuery();

      await ctx.reply(`Setting wallet ${walletId} as your default wallet...`);

      const updatedWallet = await this.walletService.setDefaultWallet(
        ctx.session.accessToken,
        walletId
      );

      if (updatedWallet) {
        const networkName = formatNetworkName(updatedWallet.network);
        const formattedAddress = formatWalletAddress(
          updatedWallet.walletAddress
        );

        const successMessage = [
          "✅ *Default Wallet Updated*",
          "",
          `*Network:* ${networkName}`,
          `*Address:* \`${formattedAddress}\``,
          `*Wallet ID:* \`${updatedWallet.id}\``,
          "",
          "_This wallet will now be used for all transactions unless specified otherwise._",
        ].join("\n");

        await ctx.reply(successMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("View All Wallets", "cmd_wallets"),
              Markup.button.callback("Main Menu", "cmd_menu"),
            ],
          ]),
        });
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
   * Handle wallet balance command with enhanced formatting
   */
  async handleWalletBalanceCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("💰 Fetching your wallet balances...");

      const walletBalances = await this.walletService.getWalletBalances(
        ctx.session.accessToken
      );

      if (walletBalances && walletBalances.length > 0) {
        let balancesMessage = "💰 *Your Wallet Balances:*\n\n";

        walletBalances.forEach((walletBalance, index) => {
          const networkName = formatNetworkName(walletBalance.network);

          balancesMessage += `*${index + 1}. ${networkName} ${walletBalance.isDefault ? "✅" : ""}*\n`;

          if (walletBalance.balances && walletBalance.balances.length > 0) {
            walletBalance.balances.forEach((balance) => {
              balancesMessage += `   ${balance.balance} ${balance.symbol}\n`;
            });
          } else {
            balancesMessage += "   No token balances found\n";
          }

          balancesMessage += "\n";
        });

        await ctx.reply(balancesMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            Markup.button.callback("Send Funds", "menu_send"),
            Markup.button.callback("Withdraw", "cmd_withdraw"),
            Markup.button.callback("Main Menu", "cmd_menu"),
          ]),
        });
      } else {
        await ctx.reply(
          "No wallet balances found. Please ensure you have wallets set up on the Copperx platform.",
          Markup.inlineKeyboard([
            [Markup.button.callback("View Wallets", "cmd_wallets")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
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
