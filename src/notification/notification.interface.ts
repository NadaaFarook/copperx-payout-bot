export interface NotificationAuthResponseDto {
  auth: string;
  user_data?: string;
}

export interface PusherNotificationInterface {
  title: string;
  message: string;
  amount: number;
  currency: string;
  metadata: { network: string; txHash: string };
  organizationId: string;
  timestamp: string;
}
