# MS Bot - Discord Bot for MS Gaming

MS Bot is a Discord bot built with TypeScript and deployed on Cloudflare Workers. It provides various commands for the MS Gaming Discord server, including gaming predictions, reminders, moderation tools, and fun utilities.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup and Validation
- Bootstrap the repository:
  - `npm ci` -- takes 30-40 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- Validate the codebase:
  - `npm test` -- takes 5-10 seconds. Runs TypeScript compilation and ESLint.
  - `npm run lint` -- takes 10-15 seconds. Runs ESLint with fixes and Prettier formatting.

### Development Server
- Start the development server:
  - `npx wrangler dev --test-scheduled` -- starts in 10-15 seconds, serves on http://localhost:8787
  - The server will show binding information for D1 database and Workflows
  - Access http://localhost:8787 to verify the server responds with "Ready!"
  - Use Ctrl+C to stop the development server

### Build and Deploy
- Test build process:
  - `npx wrangler deploy --dry-run` -- takes 30-45 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
  - This validates the TypeScript compilation and bundling without actual deployment
- Deploy to production:
  - `npm run publish` -- deploys to Cloudflare Workers (requires authentication)

## Validation

### Essential Validation Steps
- ALWAYS run `npm test` after making any code changes to ensure TypeScript compilation and linting pass
- ALWAYS run `npm run lint` before committing to ensure code formatting and style compliance
- ALWAYS test the development server with `npx wrangler dev --test-scheduled` to verify the application starts correctly
- ALWAYS validate that http://localhost:8787 returns "Ready!" response when the dev server is running

### Manual Testing Scenarios
- After making changes to Discord commands: Start dev server and verify it loads without errors
- After database schema changes: Ensure the application starts and database bindings work
- After utility function changes: Run the test suite and verify no TypeScript errors
- You cannot fully test Discord bot interactions locally without proper environment variables and Discord app configuration
- The development server provides a basic HTTP endpoint but Discord webhook functionality requires proper setup

### Environment Requirements
- The bot requires various environment variables for full functionality (Discord tokens, API keys, etc.)
- These are configured in Cloudflare Workers dashboard and not available in local development
- Local development can verify code compilation and basic server functionality
- Database operations use local D1 instance during development

## Common Tasks

### Key Directories and Files
```
src/
├── index.ts              # Main Worker entry point
├── commands/             # Discord command implementations
│   ├── dev.ts           # Developer commands
│   ├── predict.ts       # Gaming predictions
│   ├── remind.ts        # Reminder functionality
│   └── ...              # Other bot commands
├── util/                # Shared utilities and types
│   ├── types.ts         # TypeScript type definitions
│   ├── rest.ts          # Discord API client
│   └── ...              # Helper functions
├── LiveMatch.ts         # Workflow for live match updates
├── LiveScore.ts         # Workflow for live score updates
├── PredictionsReminders.ts # Workflow for prediction reminders
├── Reminder.ts          # Workflow for user reminders
└── Shorten.ts           # Workflow for URL shortening

wrangler.toml            # Cloudflare Workers configuration
schema.sql               # Database schema for D1
package.json             # Dependencies and scripts
tsconfig.json            # TypeScript configuration
eslint.config.js         # ESLint configuration
```

### Architecture Overview
- **Runtime**: Cloudflare Workers (serverless JavaScript runtime)
- **Language**: TypeScript with strict type checking
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Workflows**: Cloudflare Workflows for scheduled tasks
- **Discord Integration**: Uses discord-api-types for type-safe Discord API interactions
- **No traditional build step**: Wrangler handles TypeScript compilation and bundling

### Database Schema
The bot uses three main tables:
- `Users` - User preferences and points tracking
- `Predictions` - Gaming match predictions
- `Reminders` - User reminder scheduling

### Adding New Commands
- Create new file in `src/commands/` directory
- Export command object with `data` and `run` properties
- Import and add to `src/commands/index.ts`
- Commands are automatically registered via the dev command

### Code Style and Quality
- Uses ESLint with TypeScript rules for code quality
- Prettier for consistent formatting
- Strict TypeScript configuration with multiple tsconfig extensions
- All code must pass ESLint and TypeScript compilation to be valid

### Timing Expectations and Timeouts
- **CRITICAL**: Always set appropriate timeouts for build commands
- `npm ci`: 30-40 seconds typical, use 60+ second timeout
- `npm test`: 5-10 seconds typical, use 30+ second timeout  
- `npm run lint`: 10-15 seconds typical, use 30+ second timeout
- `npx wrangler dev`: 10-15 seconds startup, use 30+ second timeout
- `npx wrangler deploy --dry-run`: 30-45 seconds, use 60+ second timeout
- **NEVER CANCEL** long-running commands - they will complete successfully

### Troubleshooting Common Issues
- **TypeScript errors**: Run `npm test` to see detailed error messages
- **Linting failures**: Run `npm run lint` to auto-fix many issues
- **Dev server not starting**: Check for TypeScript compilation errors first
- **Network errors during dev**: Normal for Cloudflare API calls in local development
- **Missing environment variables**: Expected in local development, doesn't affect basic functionality

## Deployment Context
- Production deployment requires Cloudflare Workers account and proper environment configuration
- The bot is designed for the MS Gaming Discord server
- Local development focuses on code validation rather than full Discord bot testing
- Use dry-run deployment to validate production build without actual deployment