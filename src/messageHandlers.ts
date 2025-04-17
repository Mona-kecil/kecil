import { Message, OmitPartialGroupDMChannel } from "discord.js";
import { CLIENT_ID, SERVER_ID } from "./config";
import helpCommandHandler from "./commands/messageCommands/helpCommandHandler";
import roastMeCommandHandler from "./commands/messageCommands/roastMeCommandHandler";
import reply from "./utils/reply";

const PREFIX = `<@${CLIENT_ID}>`;

export default async function messageHandlers(message: OmitPartialGroupDMChannel<Message<boolean>>) {

    const query = message.content.split(" ");
    const [prefix, command, ...contents] = query;
    
    if (prefix !== PREFIX) return;

    switch (command.toLowerCase()) {
        case "help":
            helpCommandHandler(message, message.author.username);
            return;
        case "roastme":
            roastMeCommandHandler(message, message.author);
            return;
        case "index-server":
            if (message.author.username === "monakecil") {
                reply(message, "NOT IMPLEMENTED YET.", {repliedUser: false});
                return;
            }
            reply(message, "monakecil is the only master I serve.", {repliedUser: false});
            return;
        case "chat":
            reply(message, "NOT IMPLEMENTED YET.", {repliedUser: false});
            return;
        case "memory":
            reply(message, "NOT IMPLEMENTED YET.", {repliedUser: false});
            return;
        default:
            break;
    }

    reply(message, "Invalid command.", {repliedUser: false});
    return;

}

function DEBUG_echo(message: OmitPartialGroupDMChannel<Message<boolean>>, prefix: string, command: string, contents: string[]) {
    message.reply({
        content: `Hi ${message.author}!\nPrefix: ${prefix}\nCommand: ${command}\nContents: ${contents.join(' ')}`,
        allowedMentions: {repliedUser: true}
    });
    return;
}