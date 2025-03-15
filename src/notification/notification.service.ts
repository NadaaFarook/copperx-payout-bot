import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { lastValueFrom } from "rxjs";
import Pusher from "pusher-js";
import {
  API_CONSTANTS,
  REQUEST_TIMEOUT,
} from "../common/constants/api.constants";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { NotificationAuthDto } from "./notification.dto";
import {
  NotificationAuthResponseDto,
  PusherNotificationInterface,
} from "./notification.interface";
import { TimeFormatterService } from "src/common/utils/time-formatter.util";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenInterceptor: TokenInterceptor,
    private readonly formatTime: TimeFormatterService
  ) {
    this.formatTime = new TimeFormatterService();
  }

  /**
   * Authenticate with the notification service
   * @param token The authentication token
   * @param dto The notification auth DTO
   * @returns Authentication response
   */
  async authenticate(
    token: string,
    dto: NotificationAuthDto
  ): Promise<NotificationAuthResponseDto> {
    try {
      const url = `${API_CONSTANTS.BASE_URL}${API_CONSTANTS.NOTIFICATIONS.AUTH}`;

      const config = this.tokenInterceptor.intercept(token, {
        timeout: REQUEST_TIMEOUT,
      });

      const response = await lastValueFrom(
        this.httpService.post<NotificationAuthResponseDto>(url, dto, config)
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to authenticate with notification service: ${error.message}`
      );
      throw error;
    }
  }

  /**
   * Initialize Pusher client for a user
   * @param userId Telegram user ID
   * @param token Authentication token
   * @param organizationId Organization ID
   * @param sendMessage Function to send messages back to the user
   */
  initializePusher(
    userId: number,
    token: string,
    organizationId: string,
    sendMessage: (message: string) => Promise<void>
  ): void {
    try {
      this.logger.log(`Initializing Pusher client for user ${userId}`);

      // Initialize Pusher client
      const pusherKey = process.env.PUSHER_KEY as string;
      const pusherCluster = process.env.PUSHER_CLUSTER as string;

      const pusherClient = new Pusher(pusherKey, {
        cluster: pusherCluster,
        authorizer: (channel) => ({
          authorize: async (socketId, callback) => {
            try {
              // Create auth DTO
              const authDto: NotificationAuthDto = {
                socket_id: socketId,
                channel_name: channel.name,
              };

              // Authenticate with API
              const response = await this.authenticate(token, authDto);

              if (response) {
                callback(null, { auth: response.auth });
              } else {
                callback(
                  new Error("Pusher authentication failed - null response"),
                  null
                );
              }
            } catch (error) {
              this.logger.error(`Pusher authorization error: ${error.message}`);
              callback(error, null);
            }
          },
        }),
      });

      const channelName = `private-org-${organizationId}`;

      const channel = pusherClient.subscribe(channelName);

      channel.bind("pusher:subscription_succeeded", () => {
        this.logger.log(
          `User ${userId} successfully subscribed to ${channelName}`
        );
      });

      channel.bind("pusher:subscription_error", (error: any) => {
        this.logger.error(
          `Subscription error for user ${userId}: ${JSON.stringify(error)}`
        );
      });

      channel.bind("deposit", (data: any) => {
        this.handleDepositEvent(data, sendMessage).catch((err) => {
          this.logger.error(`Error handling deposit event: ${err.message}`);
        });
      });

      this.logger.log(`Pusher client initialized for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error initializing Pusher: ${error.message}`);
    }
  }

  /**
   * Handle deposit event
   * @param data Deposit event data
   * @param sendMessage Function to send messages
   */
  private async handleDepositEvent(
    data: PusherNotificationInterface,
    sendMessage: (message: string) => Promise<void>
  ): Promise<void> {
    try {
      let message =
        `💰 *New Deposit Received*\n\n` +
        `Amount: ${data.amount} ${data.currency}\n` +
        `Network: ${data.metadata.network}\n` +
        `Tx: ${data.metadata.txHash}\n` +
        `\nTimestamp: ${this.formatTime.formatDateTime(data.timestamp)}`;

      await sendMessage(message);
    } catch (error) {
      this.logger.error(`Error handling deposit event: ${error.message}`);
    }
  }
}
