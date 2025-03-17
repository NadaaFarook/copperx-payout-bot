export const API_CONSTANTS = {
  BASE_URL: process.env.API_BASE_URL || "https://income-api.copperx.io",
  AUTH: {
    EMAIL_OTP_REQUEST: "/api/auth/email-otp/request",
    EMAIL_OTP_AUTHENTICATE: "/api/auth/email-otp/authenticate",
    ME: "/api/auth/me",
  },
  KYC: {
    GET_KYCS: "/api/kycs",
  },
  WALLETS: {
    GET_WALLETS: "/api/wallets",
    GET_DEFAULT_WALLET: "/api/wallets/default",
    SET_DEFAULT_WALLET: "/api/wallets/default",
    GET_BALANCES: "/api/wallets/balances",
    GET_BALANCE: "/api/wallets/balance",
  },
  TRANSFERS: {
    GET_TRANSFERS: "/api/transfers",
    SEND: "/api/transfers/send",
    WALLET_WITHDRAW: "/api/transfers/wallet-withdraw",
    OFFRAMP: "/api/transfers/offramp",
    SEND_BATCH: "/api/transfers/send-batch",
    DEPOSIT: "/api/transfers/deposit",
  },
  NOTIFICATIONS: {
    AUTH: "/api/notifications/auth",
    TEST: "/api/notifications/test",
  },
  QUOTES: {
    PUBLIC_OFFRAMP: "/api/quotes/public-offramp",
  },
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds
