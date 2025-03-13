import { Context } from "telegraf";
import { Logger } from "@nestjs/common";
import { KycService } from "src/kyc/kyc.service";

export class KycCommandHandler {
  private readonly logger = new Logger(KycCommandHandler.name);

  constructor(private readonly kycService: KycService) {}

  /**
   * Handle KYC status command - Get KYC status
   */
  async handleKycStatusCommand(
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
        "You need to be logged in to check KYC status. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
}
