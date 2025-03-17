/**
 * Format wallet address for display by shortening it
 * @param address Full wallet address
 * @returns Shortened address for display
 */
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Format network name for display
 * @param network Network identifier
 * @returns Formatted network name
 */
export function formatNetworkName(network: string): string {
  const networkMap: { [key: string]: string } = {
    "137": "Polygon",
    "80002": "Polygon Mumbai",
    "1": "Ethereum",
    "11155111": "Sepolia",
    "42161": "Arbitrum",
    "421614": "Arbitrum Sepolia",
    "8453": "Base",
    "84532": "Base Sepolia",
    "10": "Optimism",
    "11155420": "Optimism Sepolia",
    "56": "BSC",
    "97": "BSC Testnet",
    "23434": "Starknet",
  };

  return networkMap[network as keyof typeof networkMap] || network;
}

/**
 * Format amount with proper decimal places and currency symbol
 * @param amount Amount in smallest units (8 decimal places)
 * @param currency Currency code
 * @returns Formatted amount with currency symbol
 */
export function formatAmount(amount: string, currency: string): string {
  const amountNumber = parseInt(amount, 10);

  const formattedAmount = (amountNumber / 100000000).toFixed(2);

  switch (currency.toUpperCase()) {
    case "USDC":
      return `$${formattedAmount} USDC`;
    case "USDT":
      return `$${formattedAmount} USDT`;
    case "ETH":
      return `${formattedAmount} ETH`;
    default:
      return `${formattedAmount} ${currency}`;
  }
}

/**
 * Format transfer status with emoji
 * @param status Transfer status
 * @returns Formatted status with emoji
 */
export function formatStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "pending":
      return "⏳ Pending";
    case "initiated":
      return "🔄 Initiated";
    case "processing":
      return "⚙️ Processing";
    case "success":
      return "✅ Success";
    case "approved":
      return "✅ Approved";
    case "failed":
      return "❌ Failed";
    case "rejected":
      return "❌ Rejected";
    case "canceled":
      return "🚫 Canceled";
    case "refunded":
      return "↩️ Refunded";
    case "expired":
      return "⌛ Expired";
    case "on_hold":
    case "provider_on_hold":
      return "⏸️ On Hold";
    default:
      return status;
  }
}

/**
 * Format the transfer type for display
 * @param type Transfer type
 * @returns Formatted type with emoji
 */
export function formatTransferType(type: string): string {
  switch (type.toLowerCase()) {
    case "send":
      return "➡️ Send";
    case "receive":
      return "⬅️ Receive";
    case "withdraw":
      return "💸 Withdraw";
    case "deposit":
      return "💰 Deposit";
    case "bridge":
      return "🌉 Bridge";
    case "bank_deposit":
      return "🏦 Bank Deposit";
    default:
      return type;
  }
}

/**
 * Format date and time for display
 * @param isoString ISO date string
 * @returns Formatted date and time
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

/**
 * Get a human-readable timestamp relative to now
 * @param isoString ISO date string
 * @returns Relative time (e.g., "5 minutes ago", "2 days ago")
 */
export function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else {
    return formatDateTime(isoString);
  }
}
