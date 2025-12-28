# MS Bot - Discord Bot for MS Gaming

MS Bot is a Discord bot built with TypeScript and deployed on Cloudflare Workers. It provides various slash commands for the MS Gaming Discord server.

## Working Effectively

Fetch [Workers docs](https://developers.cloudflare.com/workers/llms-full.txt) to know how to work with Cloudflare Workers and the generic [Cloudflare docs](https://developers.cloudflare.com/llms.txt) to understand how other services (like D1, Workflows, KV, etc...) work.

### Initial Setup and Validation

- Bootstrap the repository:
  - `npm ci` -- takes ~30 seconds. Set timeout to 60 seconds.
- Validate the codebase:
  - `npm run lint` -- takes ~10 seconds. Runs ESLint with fixes and Prettier formatting.
  - `npm test` -- takes ~10 seconds. Runs TypeScript and ESLint tests.

### Development Server

- Start the development server:
  - `npx wrangler dev --test-scheduled` -- starts in ~10 seconds, serves on http://localhost:8787
  - Access http://localhost:8787 to verify the server responds with "Ready!"
  - To test changes to scheduled tasks (if any), execute a GET request to `http://localhost:8787/__scheduled?cron=0+0+*+*+*`, replacing the cron expression with your own
  - Use Ctrl+C to stop the development server

### Styling

- Avoid using brackets when possible (for example, an if condition with a single statement)
- Avoid specifying the return type of a function in its definition if it's already clear
- Use arrow functions instead of traditional function expressions when possible
- Always prioritize performance over readability
- Usage of new JavaScript features is encouraged
- Comments should be added only when the logic of a code block is not immediately clear

## Validation

### Essential Validation Steps

- ALWAYS run `npm test` after making any code changes to ensure TypeScript compilation and linting pass
- ALWAYS run `npm run lint` before committing to ensure code formatting and style compliance
- ALWAYS test the development server with `npx wrangler dev --test-scheduled` to verify the application starts correctly
- ALWAYS validate that http://localhost:8787 returns "Ready!" response when the dev server is running

### Environment Requirements

- The bot requires various environment variables for full functionality (Discord tokens, API keys, etc.)
- These are configured in Cloudflare Workers dashboard and not available in local development
- Local development can verify code compilation and basic server functionality

## Common Tasks

### Key Directories and Files

```
src/
├── index.ts                # Main Worker entry point
├── commands/               # Discord command implementations
│   ├── dev.ts              # Developer commands
│   └── ...                 # Other bot commands
├── util/                   # Shared utilities and types
│   ├── types.ts            # TypeScript type definitions
│   └── ...                 # Helper functions
├── LiveScore.ts            # Workflow for live score updates
├── PredictionsReminders.ts # Workflow for prediction reminders
├── Reminder.ts             # Workflow for user reminders
└── Shorten.ts              # Workflow for URL shortening

wrangler.toml               # Cloudflare Workers configuration
schema.sql                  # Database schema for D1
package.json                # Dependencies and scripts
tsconfig.json               # TypeScript configuration
eslint.config.js            # ESLint configuration
```

### Architecture Overview

- **Runtime**: Cloudflare Workers (serverless JavaScript/TypeScript runtime)
- **Language**: TypeScript with strict type checking
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Workflows**: Cloudflare Workflows for scheduled tasks
- **Discord Integration**: Uses discord-api-types and other @discordjs/\* packages for type-safe Discord API interactions
- **No build step**: Cloudflare Workers handle TypeScript compilation and bundling

### Database Schema

The bot uses three main tables:

- `Users` - User preferences and points tracking
- `Predictions` - Gaming match predictions
- `Reminders` - User reminder scheduling

### Commands structure

- Commands need to satisfy `CommandOptions<ApplicationCommandType.ChatInput>`, where `ChatInput` is used for slash commands, `Message` for message context menu commands, etc...
- The `CommandOptions` object has the following properties:

  - `data`: An array of command data, following the Discord API structure `APIApplicationCommand`. Normally, the data array should include only one command.
  - `run`: The function to execute when the command is invoked. It takes two arguments:
    - `reply`: A function to send a reply to the interaction of type `APIInteractionResponseChannelMessageWithSource | APIInteractionResponseDeferredChannelMessageWithSource | APIModalInteractionResponse`
    - `context`: An object with the following properties:
      - `interaction`: The interaction object received from Discord
      - `context`: Worker's `ExecutionContext`
      - `env`: Environment variables

  The following properties are optional and should be added only if needed:

  - `isPrivate`: `true` if the command can be executed only by the bot owner.
  - `autocomplete`: A function to handle `APIApplicationCommandAutocompleteInteraction` (to autocomplete options with `autocomplete: true`). It takes the same arguments as `run`, except for the `reply` function which accepts `APIApplicationCommandAutocompleteResponse` as argument.
  - `component`: A function to handle `APIMessageComponentInteraction`. It takes the same arguments as `run`, except for the `reply` function which accepts `APIInteractionResponseChannelMessageWithSource | APIInteractionResponseDeferredChannelMessageWithSource | APIInteractionResponseDeferredMessageUpdate | APIInteractionResponseUpdateMessage | APIModalInteractionResponse`.
  - `modalSubmit`: A function to handle `APIModalSubmitInteraction`. It takes the same arguments as `run`, except for the `reply` function which accepts `APIInteractionResponseChannelMessageWithSource | APIInteractionResponseDeferredChannelMessageWithSource | APIInteractionResponseDeferredMessageUpdate`.

### Adding New Commands

- Create new file in `src/commands/` directory
- Export command object with the following structure:
  - If creating a slash command, use `export const command = { ... } as const satisfies CommandOptions<ApplicationCommandType.ChatInput>` replacing `command` with the camelCase name of your command
  - Otherwise, use `export const command: CommandOptions<ApplicationCommandType.Message> = { ... }` replacing `command` with the camelCase name of your command and `ApplicationCommandType.Message` with the appropriate type
- Import and add to `src/commands/index.ts`
- To access options in the command, use `resolveCommandOptions(command.data, interaction)` from `../util`. The returned object will contain the following properties:
  - `subcommand`: The string of the subcommand used. Ignore if the command doesn't have subcommands
  - `options`: The options passed to the command, like `{ optionName: optionValue }`. Note that the `optionValue` is either a string, a number, or a boolean; for options of type user, channel, etc., the value will be the ID of the user/channel/etc. Use `interaction.data.resolved.users[optionValue]` to get the user object, `interaction.data.resolved.channels[optionValue]` for channels, etc.
- Interactions need a response within 3 seconds. If the function may take longer to reply, use `reply({ type: InteractionResponseType.DeferredChannelMessageWithSource })` to defer the interaction. To reply after deferring, use
  ```ts
  rest.patch(
  	Routes.webhookMessage(interaction.application_id, interaction.token),
  	{
  		body: {
  			/* ... */
  		} satisfies RESTPatchAPIWebhookWithTokenMessageJSONBody,
  	},
  );
  ```
- Always use other commands as reference for structure and implementation.

## Deployment Context

- Production deployment requires Cloudflare Workers account and proper environment configuration
- NEVER run the deploy command as it should be used only by the Worker's build process
- Local development focuses on code validation rather than full Discord bot testing
- Commit messages and PRs titles should be descriptive and follow the format `type: description`, where `type` is one of `feat`, `fix`, `refactor`, `test`, or `chore`
- Commit messages' first line should never exceed 50 characters. Use additional lines for detailed descriptions if necessary
