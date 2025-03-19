# Copperx Telegram Bot

A Telegram bot for Copperx Payout platform that enables user authentication and account management directly from Telegram.

## Features

- User authentication through email OTP
- View user account information
- KYC status checking
- Secure session management
- User-friendly command interface

## Technical Stack

- [NestJS](https://nestjs.com/) - A progressive Node.js framework for building server-side applications
- [Telegraf](https://telegraf.js.org/) - Modern Telegram Bot API framework for Node.js
- [Axios](https://axios-http.com/) - Promise based HTTP client for the browser and Node.js
- [TypeScript](https://www.typescriptlang.org/) - Typed superset of JavaScript

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Telegram Bot Token (obtained from [@BotFather](https://t.me/botfather))

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/copperx-telegram-bot.git
   cd copperx-telegram-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create an environment file by copying the example:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Telegram Bot Token and other configuration:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   API_BASE_URL=https://income-api.copperx.io
   ```

## Running the Bot

### Development Mode

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## Bot Commands

The bot supports the following commands:

- `/start` - Starts the bot and displays welcome message
- `/help` - Shows the list of available commands
- `/login` - Initiates the authentication flow
- `/logout` - Ends the current session

## Authentication Flow

1. User initiates the flow with `/login` command
2. Bot prompts for email address
3. System sends OTP to the provided email
4. Bot prompts user to enter the received OTP
5. System verifies OTP and authenticates the user
6. Upon successful authentication, user details are displayed

## Security Features

- Secure token storage in session data
- Input validation for email and OTP
- Proper error handling and user feedback
- Session expiry management
- No plaintext password storage

## Project Structure

```
src/
├── app.module.ts          # Main application module
├── main.ts                # Application entry point
├── common/                # Shared utilities, constants, and interceptors
├── auth/                  # Authentication module with Copperx API integration
└── bot/                   # Telegram bot implementation and session management
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For support, please reach out to the Copperx community at [Telegram Community](https://t.me/copperxcommunity/2183).
