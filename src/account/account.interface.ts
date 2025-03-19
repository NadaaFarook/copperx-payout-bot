import { Country } from "src/quote/quote.enum";
import { WalletAccountType } from "src/wallet/wallet.enum";

export enum AccountType {
  INTERNAL = "internal",
  EXTERNAL = "external",
}

export enum TransferAccountType {
  CRYPTO = "crypto",
  BANK = "bank",
  EMAIL = "email",
}

export enum AccountStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  DELETED = "deleted",
}

export interface AccountProviderSlimDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  providerId: string;
  externalId: string;
  status: string;
}

export interface BankAccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  accountId: string;
  name: string;
  email: string;
  phoneNumber: string;
  bankName: string;
  bankAddress: string;
  routingNumber: string;
  accountNumber: string;
  currency: string;
  branchName: string;
  ifscCode: string;
  swiftCode: string;
  iban: string;
  beneficiaryAddress: string;
}

export interface AccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  type: string;
  walletAccountType: WalletAccountType;
  method: TransferAccountType;
  country: Country;
  network: string;
  walletAddress: string;
  isDefault: boolean;
  bankAccount: BankAccountDto;
  accountKycs: AccountProviderSlimDto[];
  status: AccountStatus;
}

export interface AccountsResponseDto {
  total: number;
  data: AccountDto[];
}
