# Copperx Telegram Bot

A friendly Telegram bot that lets Copperx users check balances, send money, and get deposit alerts without opening the web app.

Try it out: [t.me/copperx_test_bot](https://t.me/copperx_test_bot)

## What can this bot do?

- 🔐 **Log in securely** with email OTP verification
- 👛 **Check your wallets** and balances across networks
- 💸 **Send money** to emails or crypto wallets
- 🏦 **Withdraw funds** to bank accounts
- 📱 **Get instant alerts** when someone sends you money
- 📊 **View your recent transactions**

## Setting up the bot

### You'll need:

- Node.js (v16+)
- Redis (for session storage)
- A Telegram bot token from BotFather

### Quick setup:

1. **Clone and install:**

   ```bash
   git clone <repo-url>
   cd copperx-telegram-bot
   npm install
   ```

2. **Create a `.env` file:**

   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   API_BASE_URL=https://income-api.copperx.io
   REDIS_URL=redis://localhost:6379
   PUSHER_KEY=e089376087cac1a62785
   PUSHER_CLUSTER=ap1
   ```

3. **Start Redis:**

   ```bash
   redis-server
   ```

4. **Start the bot:**
   ```bash
   npm run start:dev   # development
   # or
   npm run start:prod  # production
   ```

## Bot commands

- `/start` - Welcome message and login
- `/menu` - Show main menu
- `/login` - Log in to your Copperx account
- `/logout` - End your session
- `/profile` - View your profile
- `/balance` - Check your wallet balances
- `/wallets` - See all your wallets
- `/send` - Send money to someone
- `/withdraw` - Withdraw to a wallet
- `/bankwithdraw` - Withdraw to your bank
- `/transfers` - See your recent transactions
- `/notifications` - Toggle deposit alerts
- `/kyc` - Check your KYC status
- `/help` - Get help with commands

## How it connects to Copperx

The bot talks to the Copperx API to handle:

- **Auth**: Email OTP login, session management
- **Wallets**: Fetching balances, setting default wallet
- **Transfers**: Sending money, bank withdrawals
- **Notifications**: Real-time deposit alerts via Pusher

## Troubleshooting

**Bot not responding?**

- Check if your bot token is correct
- Make sure Redis is running: `redis-cli ping`

**Login problems?**

- Verify your email is registered with Copperx
- Check if the API is accessible

**Transfer issues?**

- Confirm you have enough balance
- Make sure your KYC is approved
- Double-check recipient details

## Under the hood

Built with NestJS and Telegraf, the bot uses a modular architecture:

- Redis for secure session storage
- Middleware for auth protection
- Pusher for real-time notifications
- Strong typing throughout

Security features include token encryption, session timeouts, and transaction confirmations.

---

Made with ❤️ by [Nadaa](nadaa.vervel.app)
