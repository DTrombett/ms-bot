import {
  APIApplicationCommandAutocompleteResponse,
  APIApplicationCommandOption,
  APIInteraction,
  APIInteractionResponseChannelMessageWithSource,
  APIInteractionResponseDeferredChannelMessageWithSource,
  APIInteractionResponseDeferredMessageUpdate,
  APIInteractionResponseUpdateMessage,
  APIModalInteractionResponse,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionType,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import type { Command } from ".";

export type Awaitable<T> = Promise<T> | T;

export type InteractionByType<
  T extends InteractionType,
  I extends APIInteraction = APIInteraction,
> = I extends APIInteraction & { type: T } ? I : never;
export type CommandInteractionByType<
  T extends ApplicationCommandType,
  I extends
    InteractionByType<InteractionType.ApplicationCommand> = InteractionByType<InteractionType.ApplicationCommand>,
> = I extends InteractionByType<InteractionType.ApplicationCommand> & {
  data: { type: T };
}
  ? I
  : never;

export type CommandData<
  T extends ApplicationCommandType = ApplicationCommandType,
  O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
  N extends string = string,
> = RESTPostAPIApplicationCommandsJSONBody & {
  type: T;
  options?: (APIApplicationCommandOption & {
    type: O;
  })[];
  name: N;
};

/**
 * Options to create a command
 */
export type CommandOptions<
  T extends ApplicationCommandType = ApplicationCommandType,
  O extends ApplicationCommandOptionType = ApplicationCommandOptionType,
  N extends string = string,
> = {
  /**
   * The data for this command
   */
  data: [CommandData<T, O, N>, ...CommandData<T, O, N>[]];

  /**
   * If this command is private
   */
  isPrivate?: boolean;

  /**
   * A functions to run when an autocomplete request is received by Discord.
   * @param this - The command object that called this
   * @param interaction - The interaction received
   */
  autocomplete?(
    this: Command,
    interaction: InteractionByType<InteractionType.ApplicationCommandAutocomplete>,
    resolve: (
      result: Awaitable<APIApplicationCommandAutocompleteResponse>,
    ) => void,
    reject: (error: unknown) => void,
  ): Awaitable<void>;

  /**
   * A function to run when an interaction from a message component with the custom_id of this command is received.
   * @param this - The command object that called this
   * @param interaction - The interaction received
   */
  component?(
    this: Command,
    interaction: InteractionByType<InteractionType.MessageComponent>,
    resolve: (
      result: Awaitable<
        | APIInteractionResponseChannelMessageWithSource
        | APIInteractionResponseDeferredChannelMessageWithSource
        | APIInteractionResponseDeferredMessageUpdate
        | APIInteractionResponseUpdateMessage
        | APIModalInteractionResponse
      >,
    ) => void,
    reject: (error: unknown) => void,
  ): Awaitable<void>;

  /**
   * A function to run when a modal is submitted with the custom_id of this command is received.
   * @param this - The command object that called this
   * @param interaction - The interaction received
   */
  modalSubmit?(
    this: Command,
    interaction: InteractionByType<InteractionType.ModalSubmit>,
    resolve: (
      result: Awaitable<
        | APIInteractionResponseChannelMessageWithSource
        | APIInteractionResponseDeferredChannelMessageWithSource
        | APIInteractionResponseDeferredMessageUpdate
      >,
    ) => void,
    reject: (error: unknown) => void,
  ): Awaitable<void>;

  /**
   * A function to run when this command is received.
   * @param this - The command object that called this
   * @param interaction - The interaction received
   */
  run(
    this: Command,
    interaction: CommandInteractionByType<T>,
    resolve: (
      result: Awaitable<
        | APIInteractionResponseChannelMessageWithSource
        | APIInteractionResponseDeferredChannelMessageWithSource
        | APIModalInteractionResponse
      >,
    ) => void,
    reject: (error: unknown) => void,
  ): Awaitable<void>;
};
export type ReceivedInteraction = InteractionByType<
  | InteractionType.ApplicationCommand
  | InteractionType.MessageComponent
  | InteractionType.ModalSubmit
>;

/**
 * A response from thecatapi.com
 */
export type CatResponse = {
  breeds: [];
  categories: { id: number; name: string }[];
  height: number;
  id: string;
  url: string;
  width: number;
}[];

/**
 * A response from thedogapi.com
 */
export type DogResponse = {
  breeds: [];
  height: number;
  id: string;
  url: string;
  width: number;
}[];

/**
 * A response from api.urbandictionary.com
 */
export type UrbanResponse = {
  list: {
    definition: string;
    permalink: string;
    thumbs_up: number;
    sound_urls: string[];
    author: string;
    word: string;
    defid: number;
    current_vote: "";
    written_on: string;
    example: string;
    thumbs_down: number;
  }[];
};

export type MatchesData =
  | {
      success: true;
      data: {
        home_goal: number | null;
        away_goal: number | null;
        home_team_name: Uppercase<string>;
        away_team_name: Uppercase<string>;
        date_time: string;
        match_status: number;
        slug: string;
        match_id: number;
      }[];
    }
  | { success: false; message: string; errors: unknown[] };

export type Env = {
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  OWNER_ID: string;
};
