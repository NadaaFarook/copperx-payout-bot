import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { UserSession } from "./bot/bot.interface";

@Injectable()
export class RedisSessionStore implements OnModuleInit {
  private readonly logger = new Logger(RedisSessionStore.name);
  private redisClient: Redis;
  private readonly keyPrefix = "telegram-bot:session:";
  private readonly expireTime = 60 * 60 * 24 * 7; // 7 days in seconds

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async onModuleInit() {
    try {
      await this.redisClient.ping();
      this.logger.log("Successfully connected to Redis");
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a session by user ID
   */
  async getSession(userId: number): Promise<UserSession | null> {
    try {
      const session = await this.redisClient.get(this.getKey(userId));
      return session ? JSON.parse(session) : null;
    } catch (error) {
      this.logger.error(`Error retrieving session: ${error.message}`);
      return null;
    }
  }

  /**
   * Save or update a session
   */
  async saveSession(
    userId: number,
    sessionData: Partial<UserSession>
  ): Promise<void> {
    try {
      const key = this.getKey(userId);
      const existingSession = await this.getSession(userId);

      const updatedSession = {
        ...(existingSession || {}),
        ...sessionData,
        lastActivity: sessionData.lastActivity || new Date(),
      };

      await this.redisClient.set(
        key,
        JSON.stringify(updatedSession),
        "EX",
        this.expireTime
      );
    } catch (error) {
      this.logger.error(`Error saving session: ${error.message}`);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(userId: number): Promise<void> {
    try {
      await this.redisClient.del(this.getKey(userId));
    } catch (error) {
      this.logger.error(`Error deleting session: ${error.message}`);
    }
  }

  /**
   * Update session expiry time
   */
  async touchSession(userId: number): Promise<void> {
    try {
      const key = this.getKey(userId);
      const exists = await this.redisClient.exists(key);

      if (exists) {
        await this.redisClient.expire(key, this.expireTime);

        const session = await this.getSession(userId);
        if (session) {
          session.lastActivity = new Date();
          await this.saveSession(userId, session);
        }
      }
    } catch (error) {
      this.logger.error(`Error touching session: ${error.message}`);
    }
  }

  /**
   * Get all active sessions
   */
  async getAllSessions(): Promise<Map<number, UserSession>> {
    const sessions = new Map<number, UserSession>();

    try {
      const keys = await this.redisClient.keys(`${this.keyPrefix}*`);

      if (keys.length > 0) {
        const pipeline = this.redisClient.pipeline();
        keys.forEach((key) => pipeline.get(key));

        const results = await pipeline.exec();
        if (results) {
          results.forEach((result, index) => {
            if (result[1]) {
              const userId = parseInt(
                keys[index].replace(this.keyPrefix, ""),
                10
              );
              const session = JSON.parse(result[1] as string);
              sessions.set(userId, session);
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error getting all sessions: ${error.message}`);
    }

    return sessions;
  }

  /**
   * Generate Redis key from user ID
   */
  private getKey(userId: number): string {
    return `${this.keyPrefix}${userId}`;
  }
}
