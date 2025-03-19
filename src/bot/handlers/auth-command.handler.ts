import { Context, Markup } from "telegraf";
import { Injectable, Logger } from "@nestjs/common";
import { AuthService } from "src/auth/auth.service";
import { AuthStep } from "../bot.interface";
import { AuthenticatedContext } from "src/auth-middleware";
import {
  LoginEmailOtpRequestDto,
  VerifyEmailOtpRequestDto,
} from "src/auth/auth.dto";
import { SessionManager } from "../session-manager";

@Injectable()
export class AuthCommandHandler {
  private readonly logger = new Logger(AuthCommandHandler.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionManager: SessionManager
  ) {}

  /**
   * Handle login command
   */
  async handleLoginCommand(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { authenticated } = await this.sessionManager.isAuthenticated(userId);

    if (authenticated) {
      await ctx.reply(
        "You are already logged in.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Logout", "cmd_logout")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return;
    }

    await this.sessionManager.updateSession(userId, {
      step: AuthStep.WAITING_FOR_EMAIL,
      lastActivity: new Date(),
    });

    await ctx.reply(
      "🔑 *Login to your Copperx Account*\n\n" +
        "Please enter your email address to receive a one-time verification code.",
      { parse_mode: "Markdown" }
    );
  }

  /**
   * Handle logout command with confirmation
   */
  async handleLogoutCommand(ctx: AuthenticatedContext) {
    if (ctx.session && ctx.session.step === AuthStep.AUTHENTICATED) {
      await ctx.reply(
        "Are you sure you want to logout?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Yes", "logout_confirm"),
            Markup.button.callback("No", "cmd_menu"),
          ],
        ])
      );
    } else {
      await ctx.reply(
        "You are not currently logged in.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login", "cmd_login")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle logout confirmation callback
   */
  async handleLogoutConfirmCallback(ctx: Context) {
    try {
      await ctx.answerCbQuery();

      const userId = ctx.from?.id;

      if (userId) {
        await this.sessionManager.resetSession(userId);
        await ctx.reply(
          "You have been logged out successfully.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Login Again", "cmd_login")],
            [Markup.button.callback("Main Menu", "cmd_menu")],
          ])
        );
      } else {
        await ctx.reply("Error: User ID not found.");
      }
    } catch (error) {
      this.logger.error(`Error handling logout confirmation: ${error.message}`);
      await ctx.reply("An error occurred. Please try again.");
    }
  }

  /**
   * Handle email input with clear validation
   */
  async handleEmailInput(ctx: Context, email: string) {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("Error: User ID not found.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await ctx.reply(
        "⚠️ Invalid email format. Please enter a valid email address:"
      );
      return;
    }

    try {
      await ctx.reply("📤 Sending OTP to your email...");

      const dto: LoginEmailOtpRequestDto = { email };
      const response = await this.authService.requestEmailOtp(dto);

      if (response) {
        await this.sessionManager.updateSession(userId, {
          step: AuthStep.WAITING_FOR_OTP,
          email,
          sid: response.sid,
          lastActivity: new Date(),
        });

        await ctx.reply(
          "📩 Verification code sent!\n\n" +
            "Please check your email and enter the 6-digit OTP code below."
        );
      } else {
        await ctx.reply(
          "❌ Failed to send verification code.\n\n" +
            "Please try again or contact support.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_login")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error requesting OTP: ${error.message}`);
      await ctx.reply(
        "❌ An error occurred while requesting verification code.\n\n" +
          "Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_login")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle OTP input with clear validation
   */
  async handleOtpInput(ctx: Context, otp: string) {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("❌ User ID not found. Please try again.");
      return;
    }

    const session = await this.sessionManager.getSession(userId);

    if (!session) {
      await ctx.reply(
        "❌ Session not found. Please start the login process again.",
        Markup.inlineKeyboard([[Markup.button.callback("Login", "cmd_login")]])
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      await ctx.reply(
        "⚠️ Invalid OTP format. Please enter a valid 6-digit verification code."
      );
      return;
    }

    try {
      await ctx.reply("🔍 Verifying code...");

      const dto: VerifyEmailOtpRequestDto = {
        email: session?.email || "",
        otp,
        sid: session?.sid || "",
      };

      const authResponse = await this.authService.verifyEmailOtp(dto);

      if (authResponse.accessToken) {
        const userInfo = await this.authService.getAuthUser(
          authResponse.accessToken
        );

        await this.sessionManager.updateSession(userId, {
          step: AuthStep.AUTHENTICATED,
          accessToken: authResponse.accessToken,
          expireAt: authResponse.expireAt,
          organizationId: userInfo.organizationId,
          lastActivity: new Date(),
        });

        if (userInfo.organizationId) {
          const sendMessage = async (message: string) => {
            if (ctx.telegram) {
              await ctx.telegram.sendMessage(userId, message, {
                parse_mode: "Markdown",
              });
            }
          };

          await this.sessionManager.enableNotifications(
            userId,
            userInfo.organizationId,
            sendMessage
          );
        }

        await ctx.reply(
          `✅ *Login Successful!*\n\n` +
            `Welcome ${userInfo.firstName || userInfo.email}!\n\n` +
            `Email: ${userInfo.email}\n` +
            `KYC Status: ${userInfo.status || "Not started"}` +
            `\n\n🔔 You will now receive notifications for deposits.`,
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              [Markup.button.callback("View Profile", "cmd_profile")],
              [Markup.button.callback("Main Menu", "cmd_menu")],
            ]),
          }
        );
      } else {
        await ctx.reply(
          "❌ Authentication failed. Please try again.",
          Markup.inlineKeyboard([
            [Markup.button.callback("Try Again", "cmd_login")],
          ])
        );
      }
    } catch (error) {
      this.logger.error(`Error verifying OTP: ${error.message}`);
      await ctx.reply(
        "❌ Failed to verify code. Please check your code and try again.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_login")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }

  /**
   * Handle profile command with enhanced formatting
   */
  async handleProfileCommand(ctx: AuthenticatedContext) {
    try {
      await ctx.reply("🔍 Fetching your profile information...");

      const userInfo = await this.authService.getAuthUser(
        ctx.session.accessToken
      );

      const profileMessage = [
        "👤 *User Profile*",
        "",
        `*Email:* ${userInfo.email}`,
        `*Wallet Address:* ${userInfo.walletAddress || "Not connected"}`,
        `*Notifications:* ${ctx.session.notificationsEnabled ? "Enabled 🔔" : "Disabled 🔕"}`,
      ].join("\n");

      await ctx.reply(profileMessage, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("Check KYC Status", "cmd_kyc")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ]),
      });
    } catch (error) {
      this.logger.error(`Error fetching profile: ${error.message}`);
      await ctx.reply(
        "Failed to fetch your profile information. Please try again later.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Try Again", "cmd_profile")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
    }
  }
}
