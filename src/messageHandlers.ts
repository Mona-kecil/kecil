import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { CLIENT_ID, SERVER_ID } from "./config";
import helpCommandHandler from "./commands/messageCommands/helpCommandHandler";
import roastMeCommandHandler from "./commands/messageCommands/roastMeCommandHandler";
import reply from "./utils/reply";

const PREFIX = `<@${CLIENT_ID}>`;

export default async function messageHandlers(message: OmitPartialGroupDMChannel<Message<boolean>>, isDev: string | undefined) {
    if (message.author.bot && message.author.id != CLIENT_ID) return;

    if (!isDev && message.guild?.id !== SERVER_ID) {
        reply(message, "I can only be used inside Teyvat.", {repliedUser: false});
        return;
    }

    const query = message.content.split(" ");
    const [prefix, command, ...contents] = query;
    
    if (prefix !== PREFIX) return;

    // DEBUG_echo(message, prefix, command, contents);
    if (command.toLowerCase() === "help") {
        helpCommandHandler(message, message.author.username);
        return;
    }
    
    if (command.toLowerCase() === "roastme") {
        roastMeCommandHandler(message, message.author);
        return;
    }

    if (command.toLocaleLowerCase() === "index-server" && message.author.username === "monakecil") {
        try {
            message.reply("NOT IMPLEMENTED YET.");
        } catch (err) {
            console.error(`[ERROR] Failed to send message to user ${message.author.tag}: ${err}`);
        }
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