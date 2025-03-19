import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { NotificationService } from "./notification.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [NotificationService, TokenInterceptor],
  exports: [NotificationService],
})
export class NotificationModule {}
