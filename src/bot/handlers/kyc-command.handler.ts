import { Markup } from "telegraf";
import { Logger } from "@nestjs/common";
import { KycService } from "src/kyc/kyc.service";
import { AuthenticatedContext } from "src/auth-middleware";

export class KycCommandHandler {
  private readonly logger = new Logger(KycCommandHandler.name);

  constructor(private readonly kycService: KycService) {}

  /**
   * Handle KYC status command with enhanced presentation
   * Now uses session directly from context or callback
   */
  async handleKycStatusCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("🔍 Checking your KYC status...");

      const kycResponse = await this.kycService.getKycStatus(
        ctx.session.accessToken
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

        // Build the base KYC message with markdown
        let kycMessage = [
          `🪪 *KYC Status:* ${statusEmoji} *${latestKyc.status.toUpperCase()}*\n`,
          `${statusDesc}`,
          `${timeEstimate}\n`,
          `*Profile Type:* ${profileType}`,
          `*Verification Provider:* ${latestKyc.kycProviderCode || "Not specified"}`,
          `*Submitted:* ${new Date(latestKyc.createdAt).toLocaleString() || "Unknown"}`,
          latestKyc.updatedAt
            ? `*Last Updated:* ${new Date(latestKyc.updatedAt).toLocaleString()}`
            : "",
        ]
          .filter((line) => line !== "")
          .join("\n");

        // Add next steps
        kycMessage += `\n\n⏭️ *Next Steps:*\n${nextSteps}`;

        // Add rejection reason if available
        if (
          latestKyc.status.toLowerCase() === "rejected" &&
          latestKyc.statusUpdates
        ) {
          kycMessage += `\n\n❗ *Rejection Reason:*\n${latestKyc.statusUpdates}`;
        }

        await ctx.reply(kycMessage, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.url(
                "Go to Copperx Payout Platform",
                "payout.copperx.io"
              ),
            ],
            [Markup.button.callback("View Profile", "cmd_profile")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ]),
        });
      } else {
        // No KYC records found
        await ctx.reply(
          "📋 You haven't started the KYC process yet.\n\n" +
            "Please complete your KYC verification on the Copperx platform to access all features.",
          Markup.inlineKeyboard([
            [Markup.button.url("Go to Copperx Platform", "https://copperx.io")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error fetching KYC status: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your KYC status. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_kyc")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }
}
