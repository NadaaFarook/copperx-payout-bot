import { IsNotEmpty, IsString } from "class-validator";

export class NotificationAuthDto {
  @IsString()
  @IsNotEmpty()
  socket_id: string;

  @IsString()
  channel_name: string;
}
