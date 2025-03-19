import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BotModule } from "./bot/bot.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local"],
      load: [
        () => ({
          REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
          REDIS_TTL: parseInt(process.env.REDIS_TTL || "604800", 10), // 7 days in seconds
          NODE_ENV: process.env.NODE_ENV || "development",
        }),
      ],
    }),
    BotModule,
  ],
})
export class AppModule {}
