import { Injectable, Logger } from "@nestjs/common";
import { AuthStep, UserSession } from "./bot.interface";
import { NotificationService } from "../notification/notification.service";
import { RedisSessionStore } from "../redis-session-store";

@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly redisSessionStore: RedisSessionStore
  ) {}

  /**
   * Get user session
   */
  async getSession(userId: number): Promise<UserSession | null> {
    return this.redisSessionStore.getSession(userId);
  }

  /**
   * Update user session
   */
  async updateSession(userId: number, sessionData: Partial<UserSession>) {
    await this.redisSessionStore.saveSession(userId, {
      ...sessionData,
      lastActivity: new Date(),
    });
  }

  /**
   * Update session last activity timestamp
   */
  async updateSessionActivity(userId: number) {
    await this.redisSessionStore.touchSession(userId);
  }

  /**
   * Reset user session
   */
  async resetSession(userId: number) {
    await this.disableNotifications(userId);
    await this.redisSessionStore.deleteSession(userId);
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(userId: number): Promise<{
    authenticated: boolean;
    session?: UserSession;
  }> {
    const session = await this.getSession(userId);

    if (!session || session.step !== AuthStep.AUTHENTICATED) {
      return {
        authenticated: false,
      };
    }

    if (session.expireAt && new Date() > new Date(session.expireAt)) {
      await this.resetSession(userId);
      return {
        authenticated: false,
      };
    }

    return {
      authenticated: true,
      session,
    };
  }

  /**
   * Enable notifications for a user
   */
  async enableNotifications(
    userId: number,
    organizationId: string,
    sendMessage: (message: string) => Promise<void>
  ) {
    const session = await this.getSession(userId);

    if (session && session.accessToken) {
      this.logger.log(`Enabling notifications for user ${userId}`);

      this.notificationService.initializePusher(
        userId,
        session.accessToken,
        organizationId,
        sendMessage
      );

      await this.updateSession(userId, {
        organizationId,
        notificationsEnabled: true,
      });
    } else {
      this.logger.error(
        `Cannot enable notifications: User ${userId} not authenticated`
      );
    }
  }

  /**
   * Disable notifications for a user
   */
  async disableNotifications(userId: number) {
    const session = await this.getSession(userId);

    if (session && session.notificationsEnabled) {
      this.logger.log(`Disabling notifications for user ${userId}`);
      await this.updateSession(userId, { notificationsEnabled: false });
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupSessions() {
    const now = new Date().getTime();
    const allSessions = await this.redisSessionStore.getAllSessions();
    let expiredCount = 0;

    for (const [userId, session] of allSessions.entries()) {
      const lastActivity = new Date(session.lastActivity).getTime();

      if (now - lastActivity > this.SESSION_TIMEOUT) {
        await this.resetSession(userId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.logger.log(`Cleaned up ${expiredCount} expired sessions`);
    }
  }

  /**
   * Start session cleanup interval
   */
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(
      () => this.cleanupSessions(),
      15 * 60 * 1000
    );
    this.logger.log("Session cleanup interval started");
  }

  /**
   * Stop session cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log("Session cleanup interval stopped");
    }
  }
}
