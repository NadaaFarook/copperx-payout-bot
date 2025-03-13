import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { BotService } from "./bot.service";

@Injectable()
export class BotUpdate implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotUpdate.name);

  constructor(private readonly botService: BotService) {}

  async onModuleInit() {
    this.logger.log("Initializing Telegram bot...");
    try {
      await this.botService.startBot();
      this.logger.log("Telegram bot initialized successfully");
    } catch (error) {
      this.logger.error(`Failed to initialize Telegram bot: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log("Shutting down Telegram bot...");
    await this.botService.stopBot();
    this.logger.log("Telegram bot shut down successfully");
  }
}
