import { WalletAccountType } from "./wallet.enum";

export interface WalletDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  walletType: WalletAccountType;
  network: string;
  walletAddress: string;
  isDefault: boolean;
}

export interface BalanceResponseDto {
  decimals: number;
  balance: string;
  symbol: string;
  address: string;
}

export interface WalletBalanceDto {
  walletId: string;
  isDefault: boolean;
  network: string;
  balances: BalanceResponseDto[];
}
