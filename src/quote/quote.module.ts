import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { QuoteService } from "./quote.service";
import { TokenInterceptor } from "../common/interceptors/token.interceptor";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  providers: [QuoteService, TokenInterceptor],
  exports: [QuoteService],
})
export class QuoteModule {}
