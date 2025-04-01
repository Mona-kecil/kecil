import path from "path";
import fs from "fs";
import { Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import Meng from "./types/Meng";
import * as dotenv from "dotenv";
dotenv.config();

const client = new Meng({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function fetchMessages(channel: TextChannel): Promise<Message[]> {
    let messages: Message[] = []
    let lastId: string | undefined

    while (true) {
        const fetchedMessages = await channel.messages.fetch({
            limit: 100,
            before: lastId
        })

        if (fetchedMessages.size === 0) break

        messages = messages.concat(Array.from(fetchedMessages.values()))
        lastId = fetchedMessages.last()?.id
    }

    return messages
}

async function saveChannelHistory(
    channel: TextChannel,
    outputPath: string
): Promise<void> {
    try {
        console.log(`Starting to fetch messages from #${channel.name}...`)
        const messages = await fetchMessages(channel)
        console.log(`Fetched ${messages.length} messages from #${channel.name}.`)

        const output = messages.reverse().map((msg) => ({
            timestamp: msg.createdAt.toISOString(),
            author: {
                tag: msg.author.tag,
                id: msg.author.id
            },
            content: msg.content,
            attachments: Array.from(msg.attachments.values()).map((attachment) => attachment.url)
        }))

        fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8", (err) => {
            if (err) throw err;
        });
        console.log(`Chat history saved to ${outputPath}.`)

    } catch (error) {
        console.error(`Error saving chat history: ${error}`)
    }
}

client.on("messageCreate", async (message) => {
    if (message.content === "!save-chat" && message.member?.permissions.has("Administrator")) {
        if (!(message.channel instanceof TextChannel)) return

        const author = message.author
        message.delete()

        const outputDir = path.join(__dirname, `chat_logs/${message.guild?.name}`)
        fs.mkdir(outputDir, { recursive: true }, (err) => {
            if (err) throw err;
        })

        const currentDate = new Date().toLocaleDateString("id-ID").replace(/\//g, "_")
        const currentTime = new Date().toLocaleTimeString("id-ID").slice(0, 5).replace(/\./g, "_")
        const dateTime = `${currentDate}-${currentTime}`

        const fileName = `${message.channel.name}-${dateTime}.txt`
        const outputPath = path.join(outputDir, fileName)

        await author.send(`Saving chat history to ${outputPath}...`)
        await saveChannelHistory(message.channel, outputPath)
        await author.send(`Chat history saved to ${outputPath}`)
    }
})

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)
