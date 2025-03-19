import { Module } from "@nestjs/common";
import { RedisSessionStore } from "../redis-session-store";
import { SessionManager } from "../bot/session-manager";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [NotificationModule],
  providers: [RedisSessionStore, SessionManager],
  exports: [RedisSessionStore, SessionManager],
})
export class SessionModule {}
