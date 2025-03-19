import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AuthService } from "./auth.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";
import { AuthCommandHandler } from "src/bot/handlers/auth-command.handler";
import { SessionModule } from "../session/session.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    SessionModule,
  ],
  providers: [AuthService, AuthCommandHandler, TokenInterceptor],
  exports: [AuthService, AuthCommandHandler],
})
export class AuthModule {}
