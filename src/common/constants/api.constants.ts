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
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds
