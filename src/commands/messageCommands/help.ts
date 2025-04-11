import { Message } from "discord.js";

export default function helpCommandHandler(message: Message<boolean>, author: string) {
    if (author === "monakecil") {
        message.reply({
            embeds: [{
                title: "Help message - producer",
                description: `${authorizedUser.join('\n')}`
            }],
            allowedMentions: { repliedUser: false }
        });
    } else {
        message.reply({
            embeds: [{
                title: "Help message - consumer",
                description: `${publicUser.join('\n')}`
            }],
            allowedMentions: { repliedUser: false }
        });
    }

    return;
}

const publicUser = [
    "**help**: Show this message",
    "**roastme**: Get roasted based on your recent chat history"
];

const authorizedUser = [
    ...publicUser,
    "**index-server**: Fetch all chat messages from every text channel in the server and store it inside a vector database."
];