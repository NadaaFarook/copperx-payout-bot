import {
  Currency,
  PurposeCode,
  SourceOfFunds,
  TransferStep,
} from "./transfer.enum";

export interface TransferSessionData {
  step: TransferStep;
  recipientEmail?: string;
  recipientWalletAddress?: string;
  amount?: string;
  currency?: Currency;
  purposeCode?: PurposeCode;
  sourceOfFunds?: SourceOfFunds;
  tempTransferData?: any;
  quotePayload?: string;
  quoteSignature?: string;
  destinationCountry?: string;
  preferredBankAccountId?: string;
}

export interface CustomerDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  businessName: string;
  email: string;
  country: string;
}

export interface TransferAccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  country: string;
  network: string;
  accountId: string;
  walletAddress: string;
  bankName: string;
  bankAddress: string;
  bankRoutingNumber: string;
  bankAccountNumber: string;
  bankDepositMessage: string;
  wireMessage: string;
  payeeEmail: string;
  payeeOrganizationId: string;
  payeeId: string;
  payeeDisplayName: string;
}

export interface TransactionDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  type: string;
  providerCode: string;
  kycId: string;
  transferId: string;
  status: string;
  externalStatus: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  totalFee: string;
  feeCurrency: string;
  transactionHash: string;
  depositAccount: TransferAccountDto;
  externalTransactionId: string;
  externalCustomerId: string;
  depositUrl: string;
}

export interface TransferWithTransactionsOnlyDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string;
  customerId: string;
  customer: CustomerDto;
  type: string;
  sourceCountry: string;
  destinationCountry: string;
  destinationCurrency: string;
  amount: string;
  currency: string;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: string;
  invoiceNumber: string;
  invoiceUrl: string;
  sourceOfFundsFile: string;
  note: string;
  purposeCode: string;
  sourceOfFunds: string;
  recipientRelationship: string;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl: string;
  mode: string;
  isThirdPartyPayment: boolean;
  transactions: TransactionDto[];
  destinationAccount: TransferAccountDto;
  sourceAccount: TransferAccountDto;
  senderDisplayName: string;
}

export interface TransferWithAccountDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string;
  customerId: string;
  customer: CustomerDto;
  type: string;
  sourceCountry: string;
  destinationCountry: string;
  destinationCurrency: string;
  amount: string;
  currency: string;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: string;
  invoiceNumber: string;
  invoiceUrl: string;
  sourceOfFundsFile: string;
  note: string;
  purposeCode: string;
  sourceOfFunds: string;
  recipientRelationship: string;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl: string;
  mode: string;
  isThirdPartyPayment: boolean;
  sourceAccount: TransferAccountDto;
  destinationAccount: TransferAccountDto;
  senderDisplayName: string;
}

export interface CreateSendTransferDto {
  walletAddress?: string;
  email?: string;
  payeeId?: string;
  amount: string;
  purposeCode: PurposeCode;
  currency: Currency;
}

export interface CreateWalletWithdrawTransferDto {
  walletAddress: string;
  amount: string;
  purposeCode: PurposeCode;
  currency: Currency;
}

export interface CreateOfframpTransferDto {
  invoiceNumber?: string;
  invoiceUrl?: string;
  purposeCode: PurposeCode;
  sourceOfFunds?: string;
  recipientRelationship?: string;
  quotePayload: string;
  quoteSignature: string;
  preferredWalletId?: string;
  customerData?: any;
  sourceOfFundsFile?: string;
  note?: string;
}

export interface CreateSendTransferBatchSingleRequestDto {
  requestId: string;
  request: CreateSendTransferDto;
}

export interface CreateSendTransferBatchDto {
  requests: CreateSendTransferBatchSingleRequestDto[];
}

export interface TransferDto {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  status: string;
  customerId: string;
  customer: CustomerDto;
  type: string;
  sourceCountry: string;
  destinationCountry: string;
  destinationCurrency: string;
  amount: string;
  currency: string;
  amountSubtotal: string;
  totalFee: string;
  feePercentage: string;
  feeCurrency: string;
  invoiceNumber: string;
  invoiceUrl: string;
  sourceOfFundsFile: string;
  note: string;
  purposeCode: string;
  sourceOfFunds: string;
  recipientRelationship: string;
  sourceAccountId: string;
  destinationAccountId: string;
  paymentUrl: string;
  mode: string;
  isThirdPartyPayment: boolean;
}

export interface CreateSendTransferBatchSingleResponseDto {
  requestId: string;
  request: CreateSendTransferDto;
  response: TransferDto;
  error?: any;
}

export interface CreateSendTransferBatchResponseDto {
  responses: CreateSendTransferBatchSingleResponseDto[];
}
