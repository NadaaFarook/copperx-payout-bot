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
  },
  TRANSFERS: {
    GET_TRANSFERS: "/api/transfers",
  },
  NOTIFICATIONS: {
    AUTH: "/api/notifications/auth",
    TEST: "/api/notifications/test",
  },
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds
