import { Injectable, Logger } from "@nestjs/common";
import { AuthStep, UserSession } from "./interfaces/session.interface";
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
    this.logger.debug(`Getting session for user ${userId}`);
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
  async isAuthenticated(userId: number): Promise<boolean> {
    this.logger.debug(`isAuthenticated called for user ${userId}`);
    const session = await this.getSession(userId);

    if (!session || session.step !== AuthStep.AUTHENTICATED) {
      this.logger.debug(
        `User ${userId} not authenticated - session missing or wrong step`
      );
      return false;
    }

    // Check if token is expired
    if (session.expireAt && new Date() > new Date(session.expireAt)) {
      this.logger.debug(`User ${userId} token expired`);
      await this.resetSession(userId);
      return false;
    }

    this.logger.debug(`User ${userId} is authenticated`);
    return true;
  }

  /**
   * Enable notifications for a user
   */
  async enableNotifications(
    userId: number,
    organizationId: string,
    sendMessage: (message: string) => Promise<void>
  ): Promise<void> {
    const session = await this.getSession(userId);

    if (session && session.accessToken) {
      this.logger.log(`Enabling notifications for user ${userId}`);

      // Initialize Pusher client for the user
      this.notificationService.initializePusher(
        userId,
        session.accessToken,
        organizationId,
        sendMessage
      );

      // Update session
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
  async disableNotifications(userId: number): Promise<void> {
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

      // Remove sessions that have been inactive for the timeout period
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.logger.debug(`Cleaning up expired session for user ${userId}`);
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
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Check every 5 minutes
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
