import { Context, Markup } from "telegraf";
import { Logger } from "@nestjs/common";
import { SessionManager } from "./bot/session-manager";

export type AuthenticatedContext = Context & {
  session: any;
};

/**
 * Factory function for creating authentication middleware
 * @param sessionManager Session manager instance to verify authentication
 * @param logger Optional logger instance for debugging
 * @returns Telegraf middleware function
 */
export function createAuthMiddleware(sessionManager: SessionManager) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply("User ID not found. Please try again.");
      return;
    }

    const { authenticated, session } =
      await sessionManager.isAuthenticated(userId);

    if (!authenticated) {
      await ctx.reply(
        "You need to be logged in to use this feature.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Login Now", "cmd_login")],
          [Markup.button.callback("Main Menu", "cmd_menu")],
        ])
      );
      return;
    }

    (ctx as AuthenticatedContext).session = session;

    await sessionManager.updateSessionActivity(userId);

    return next();
  };
}

/**
 * Function to handle auth check directly within handler methods
 * For cases where middleware can't be used or for inline callbacks
 * @param ctx Telegraf context
 * @param sessionManager Session manager instance
 * @param onAuthenticated Callback to execute when authenticated
 * @param logger Optional logger instance
 */
export async function handleAuthCheck(
  ctx: Context,
  sessionManager: SessionManager
): Promise<void | AuthenticatedContext> {
  const userId = ctx.from?.id;

  if (!userId) {
    await ctx.reply("User ID not found. Please try again.");
    return;
  }

  const { authenticated, session } =
    await sessionManager.isAuthenticated(userId);

  if (!authenticated) {
    await ctx.reply(
      "You need to be logged in to use this feature.",
      Markup.inlineKeyboard([
        [Markup.button.callback("Login Now", "cmd_login")],
        [Markup.button.callback("Main Menu", "cmd_menu")],
      ])
    );
    return;
  }

  await sessionManager.updateSessionActivity(userId);
  (ctx as AuthenticatedContext).session = session;
  return ctx as AuthenticatedContext;
}
