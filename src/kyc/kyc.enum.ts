export enum KycStatus {
  PENDING = "pending",
  INITIATED = "initiated",
  INPROGRESS = "inprogress",
  REVIEW_PENDING = "review_pending",
  REVIEW = "review",
  PROVIDER_MANUAL_REVIEW = "provider_manual_review",
  MANUAL_REVIEW = "manual_review",
  PROVIDER_ON_HOLD = "provider_on_hold",
  ON_HOLD = "on_hold",
  EXPIRED = "expired",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum KycProviderCode {
  SUMSUB = "sumsub",
  SUMSUB_UAE = "sumsub_uae",
  SUMSUB_GLOBAL = "sumsub_global",
  HYPERVERGE_IND = "hyperverge_ind",
  PERSONA = "persona",
  MANUAL = "manual",
}

export enum CustomerProfileType {
  INDIVIDUAL = "individual",
  BUSINESS = "business",
}
