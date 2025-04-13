import { Message } from "discord.js";

export default function reply(message: Message<boolean>, content: string, allowedMentions: { repliedUser: boolean }) {
    try {
        message.reply({
            content,
            allowedMentions
        });
    } catch (err) {
        console.error(`[ERROR] Failed to send message to user ${message.author.tag}: ${err}`);
    }
}