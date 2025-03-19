import { CustomerProfileType, KycProviderCode, KycStatus } from "./kyc.enum";

export interface KycVerificationDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycDetailId: string;
  kycProviderCode: KycProviderCode;
  externalCustomerId: string;
  externalKycId: string;
  status: KycStatus;
  externalStatus: string;
  verifiedAt: string;
}

export interface KycDocumentDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycDetailId: string;
  documentType: string;
  status: string;
  frontFileName: string;
  backFileName: string;
}

export interface KycDetailDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kybDetailId?: string;
  nationality: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  positionAtCompany?: string;
  sourceOfFund?: string;
  currentKycVerificationId?: string;
  currentKycVerification?: KycVerificationDto;
  kycDocuments?: KycDocumentDto[];
  kycUrl?: string;
  uboType?: string;
  percentageOfShares?: number;
  joiningDate?: string;
}

export interface KybDetailDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  companyName: string;
  companyDescription: string;
  website: string;
  incorporationDate: string;
  incorporationCountry: string;
  incorporationNumber: string;
  companyType: string;
  companyTypeOther?: string;
  natureOfBusiness: string;
  natureOfBusinessOther?: string;
  sourceOfFund?: string;
  sourceOfFundOther?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email?: string;
  phoneNumber?: string;
  currentKybVerificationId?: string;
  currentKybVerification?: any;
  kybDocuments?: any[];
  kycDetails?: KycDetailDto[];
  sourceOfFundDescription?: string;
  expectedMonthlyVolume?: number;
  purposeOfFund?: string;
  purposeOfFundOther?: string;
  operatesInProhibitedCountries?: boolean;
  taxIdentificationNumber?: string;
  highRiskActivities?: string[];
}

export interface KycAdditionalDocumentDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  kycId: string;
  name: string;
  fileName: string;
}

export interface KycDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: KycStatus;
  type: CustomerProfileType;
  country?: string;
  providerCode: string;
  kycProviderCode: KycProviderCode;
  kycDetailId?: string;
  kybDetailId?: string;
  kycDetail?: KycDetailDto;
  kybDetail?: KybDetailDto;
  kycAdditionalDocuments?: KycAdditionalDocumentDto[];
  statusUpdates?: string;
}
