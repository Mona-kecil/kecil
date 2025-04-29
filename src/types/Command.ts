import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export default interface Command {
    data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: CommandInteraction) => Promise<void>;
}
