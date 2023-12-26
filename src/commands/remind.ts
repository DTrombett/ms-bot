import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  escapeMarkdown,
} from "discord.js";
import ms from "ms";
import { Document, Timeout, TimeoutSchema } from "../models";
import {
  createCommand,
  removePermanentTimeout,
  setPermanentTimeout,
  timeoutCache,
} from "../util";

const remindLimit = 10;

export const remindCommand = createCommand({
  data: [
    {
      name: "remind",
      description: "Imposta un promemoria",
      type: ApplicationCommandType.ChatInput,
      options: [
        {
          name: "me",
          description: "Aggiungi un promemoria",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "to",
              description: "Che cosa ricordarti (es. fare la spesa)",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: "when",
              description: "Quando inviare il promemoria (es. 1d)",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "Elenca i tuoi promemoria",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: "remove",
          description: "Rimuovi un promemoria",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "remind",
              description: "Il promemoria da rimuovere",
              type: ApplicationCommandOptionType.String,
              autocomplete: true,
              required: true,
            },
          ],
        },
      ],
    },
  ],
  async run(interaction) {
    switch (interaction.options.getSubcommand()) {
      case "me":
        if (
          (await Timeout.countDocuments({
            action: "remind",
            "options.0": interaction.user.id,
          })) > remindLimit
        ) {
          await interaction.reply({
            ephemeral: true,
            content: `Non puoi avere più di ${remindLimit} promemoria!`,
          });
          return;
        }
        const date =
          interaction.createdTimestamp +
          ms(interaction.options.getString("when", true));

        if (
          Number.isNaN(date) ||
          date <= Date.now() + 1_000 ||
          // 100 years
          date > 3_153_600_000_000
        ) {
          await interaction.reply({
            ephemeral: true,
            content: "Durata non valida!",
          });
          return;
        }
        const [timeout] = await Promise.all([
          setPermanentTimeout(this.api, {
            action: "remind",
            date,
            options: [
              interaction.user.id,
              interaction.options.getString("to", true),
            ],
          }),
          interaction.deferReply({ ephemeral: true }),
        ]);

        await interaction.editReply({
          content: `Fatto! Te lo ricorderò <t:${Math.round(date / 1_000)}:R>`,
          components: [
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: `remind-${timeout.id as string}-d`,
                  label: "Rimuovi",
                  style: ButtonStyle.Danger,
                  emoji: {
                    animated: false,
                    name: "❌",
                  },
                },
              ],
            },
          ],
        });
        break;
      case "list":
        const reminds = Object.values(timeoutCache).filter(
          (t): t is Document<TimeoutSchema<"remind">> =>
            t?.action === "remind" && t.options[0] === interaction.user.id,
        );

        if (reminds.length === 0) {
          await interaction.reply({
            ephemeral: true,
            content: "Non hai impostato ancora alcun promemoria!",
          });
          return;
        }
        await interaction.reply({
          ephemeral: true,
          content: `Ecco i tuoi promemoria:\n\n${reminds
            .sort((a, b) => a.date - b.date)
            .map((t, i) => {
              const timestamp = Math.round(t.date / 1_000);

              return `${i + 1}. **${escapeMarkdown(
                t.options[1].replaceAll("\n", " "),
              )}** <t:${timestamp}:F> (<t:${timestamp}:R>)`;
            })
            .join("\n")
            .slice(0, 3975)}`,
        });
        break;
      case "remove":
        // Here the id *should* be the id of the remind to remove but there's a possibility that the user didn't select the option and sent the reminder text
        const id = interaction.options.getString("remind", true);
        const toRemove =
          timeoutCache[id]?.options[0] === interaction.user.id &&
          timeoutCache[id]?.action === "remind"
            ? timeoutCache[id]
            : Object.values(timeoutCache).find(
                (t) =>
                  t?.action === "remind" &&
                  t.options[0] === interaction.user.id &&
                  t.options[1] === id,
              );

        if (!toRemove) {
          await interaction.reply({
            ephemeral: true,
            content: "Promemoria non trovato!",
          });
          return;
        }
        await removePermanentTimeout(toRemove.id);
        await interaction.reply({
          ephemeral: true,
          content: "Promemoria eliminato!",
        });
        break;
      default:
        break;
    }
  },
  async autocomplete(interaction) {
    const reminds = Object.values(timeoutCache).filter(
      (t): t is Document<TimeoutSchema<"remind">> =>
        t?.action === "remind" && t.options[0] === interaction.user.id,
    );
    const query = interaction.options.getString("remind")?.toLowerCase() ?? "";

    await interaction.respond(
      reminds
        .filter((t) => t.options[1].toLowerCase().includes(query))
        .slice(0, 25)
        .sort((a, b) => a.date - b.date)
        .map((t) => {
          let name = ` (in ${ms(Math.round(t.date - Date.now()), {
            long: true,
          })})`;

          name =
            (t.options[1].length > 100 - name.length
              ? `${t.options[1].slice(0, 97 - name.length)}...`
              : t.options[1]) + name;
          return {
            name,
            value: t.id,
          };
        }),
    );
  },
  async component(interaction) {
    const [, id, action] = interaction.customId.split("-");

    if (!timeoutCache[id]) {
      await interaction.reply({
        content: "Questo promemoria è scaduto o è stato eliminato!",
        ephemeral: true,
      });
      return;
    }
    if (timeoutCache[id]!.options[0] !== interaction.user.id) {
      await interaction.reply({
        content: "Non puoi gestire questo promemoria!",
        ephemeral: true,
      });
      return;
    }
    switch (action) {
      case "d":
        await removePermanentTimeout(id);
        await interaction.reply({
          ephemeral: true,
          content: "Promemoria eliminato!",
        });
        break;
      default:
        break;
    }
  },
});
