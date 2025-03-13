import { Injectable, Logger } from "@nestjs/common";
import {
  AuthStep,
  SessionData,
  UserSession,
} from "./interfaces/session.interface";

@Injectable()
export class SessionManager {
  private readonly logger = new Logger(SessionManager.name);
  private readonly sessions: SessionData = {};
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  /**
   * Get user session
   */
  getSession(userId: number): UserSession | null {
    return this.sessions[userId] || null;
  }

  /**
   * Update user session
   */
  updateSession(userId: number, sessionData: Partial<UserSession>) {
    this.sessions[userId] = {
      ...this.sessions[userId],
      ...sessionData,
    };
  }

  /**
   * Update session last activity timestamp
   */
  updateSessionActivity(userId: number) {
    if (this.sessions[userId]) {
      this.sessions[userId].lastActivity = new Date();
    }
  }

  /**
   * Reset user session
   */
  resetSession(userId: number) {
    delete this.sessions[userId];
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(userId: number): boolean {
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
  cleanupSessions() {
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

  /**
   * Start session cleanup interval
   */
  startCleanupInterval() {
    setInterval(() => this.cleanupSessions(), 5 * 60 * 1000); // Check every 5 minutes
    this.logger.log("Session cleanup interval started");
  }
}
