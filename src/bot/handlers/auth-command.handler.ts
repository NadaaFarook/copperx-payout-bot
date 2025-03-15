import { Context } from "telegraf";
import { Logger } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { LoginEmailOtpRequestDto } from "src/auth/dto/login-email-otp-request.dto";
import { VerifyEmailOtpRequestDto } from "src/auth/dto/verify-email-otp-request.dto";
import { AuthStep } from "../interfaces/session.interface";

export class AuthCommandHandler {
  private readonly logger = new Logger(AuthCommandHandler.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Handle login command
   */
  async handleLoginCommand(
    ctx: Context,
    updateSession: Function,
    isAuthenticated: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    // Check if already authenticated
    if (isAuthenticated(userId)) {
      await ctx.reply(
        "You are already logged in. Use /logout to end your session."
      );
      return;
    }

    // Initialize or update session
    updateSession(userId, {
      step: AuthStep.WAITING_FOR_EMAIL,
      lastActivity: new Date(),
    });

    await ctx.reply("Please enter your email address:");
  }

  /**
   * Handle logout command
   */
  async handleLogoutCommand(
    ctx: Context,
    getSession: Function,
    resetSession: Function
  ) {
    if (!ctx.from) {
      await ctx.reply("An error occurred. Please try again.");
      return;
    }
    const userId = ctx.from.id;

    const session = getSession(userId);
    if (session && session.step === AuthStep.AUTHENTICATED) {
      resetSession(userId);
      await ctx.reply("You have been logged out successfully.");
    } else {
      await ctx.reply("You are not currently logged in.");
    }
  }

  /**
   * Handle email input
   */
  async handleEmailInput(
    ctx: Context,
    userId: number,
    email: string,
    updateSession: Function
  ) {
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
        updateSession(userId, {
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
  async handleOtpInput(
    ctx: Context,
    userId: number,
    otp: string,
    getSession: Function,
    updateSession: Function,
    enableNotifications?: Function
  ) {
    const session = getSession(userId);

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
        // Get user information
        const userInfo = await this.authService.getAuthUser(
          authResponse.accessToken
        );

        // Update session with token and organization ID
        updateSession(userId, {
          step: AuthStep.AUTHENTICATED,
          accessToken: authResponse.accessToken,
          expireAt: authResponse.expireAt,
          organizationId: userInfo.organizationId,
          lastActivity: new Date(),
        });

        // Enable notifications if function is provided
        if (enableNotifications && userInfo.organizationId) {
          const sendMessage = async (message: string) => {
            if (ctx.telegram) {
              await ctx.telegram.sendMessage(userId, message, {
                parse_mode: "Markdown",
              });
            }
          };

          enableNotifications(userId, userInfo.organizationId, sendMessage);
        }

        await ctx.reply(
          `✅ Authentication successful!\n\n` +
            `Welcome ${userInfo.firstName || userInfo.email}!\n\n` +
            `Email: ${userInfo.email}\n` +
            `KYC Status: ${userInfo.status || "Not started"}` +
            `\n\nUse /profile to see your full profile or /kyc to check your KYC status.` +
            `\n\n🔔 You will now receive notifications for deposits.`
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
   * Handle profile command
   */
  async handleProfileCommand(
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
        "You need to be logged in to view your profile. Use /login to authenticate."
      );
      return;
    }

    try {
      const session = getSession(userId);
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
        `Notifications: ${session.notificationsEnabled ? "Enabled 🔔" : "Disabled 🔕"}`,
      ].join("\n");

      await ctx.reply(profileMessage);
    } catch (error) {
      this.logger.error(`Error fetching profile: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your profile information. Please try again later."
      );
    }
  }
}
