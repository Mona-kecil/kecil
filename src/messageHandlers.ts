import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { CLIENT_ID } from "./config";
import helpCommandHandler from "./commands/messageCommands/help";

const PREFIX = `<@${CLIENT_ID}>`;

export default async function messageHandlers(message: OmitPartialGroupDMChannel<Message<boolean>>, isDev: string | undefined) {
    if (message.author.bot && message.author.id != CLIENT_ID) return;

    const query = message.content.split(" ");
    const [prefix, command, ...contents] = query;
    
    if (prefix !== PREFIX) return;

    // DEBUG_echo(message, prefix, command, contents);
    if (command.toLowerCase() === "help") {
        helpCommandHandler(message, message.author.username);
        return;
    }
    
}

function DEBUG_echo(message: OmitPartialGroupDMChannel<Message<boolean>>, prefix: string, command: string, contents: string[]) {
    message.reply({
        content: `Hi ${message.author}!\nPrefix: ${prefix}\nCommand: ${command}\nContents: ${contents.join(' ')}`,
        allowedMentions: {repliedUser: true}
    });
    return;
}