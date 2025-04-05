import fs from "fs";
import { Collection, Events, GatewayIntentBits, Message, PermissionsBitField, TextChannel } from "discord.js";
import { Data } from "./types/Data";
import Meng from "./types/Meng";
import * as dotenv from "dotenv";
import { storeAndProcessBatch } from "./dbClient";
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

async function fetchAndStoreChannelHistory(channel: TextChannel, batchSize: number = 100): Promise<{ totalAttempted: number, totalProcessed: number }> {
    console.log(`Starting to fetch messages from #${channel.name}...`)
    let lastId: string | undefined = undefined
    let totalProcessed = 0
    let totalAttempted = 0
    let batchMessages: Message[] = []
    let fetchLimit = 100

    try {
        while (true) {
            const fetchedMessages: Collection<string, Message<boolean>> = await channel.messages.fetch({
                limit: fetchLimit,
                before: lastId,
            })

            if (fetchedMessages.size === 0) break

            const messagesArray = Array.from(fetchedMessages.values()).filter(message => message.author.bot === false).reverse()
            batchMessages.push(...messagesArray as Message[])
            lastId = fetchedMessages.last()?.id

            while (batchMessages.length >= batchSize) {
                const currentBatch = batchMessages.splice(0, batchSize)
                totalAttempted += currentBatch.length
                const processedCount = await storeAndProcessBatch(currentBatch)
                totalProcessed += processedCount!
            }

            console.log(`[History] Fetched ${fetchedMessages.size} from #${channel.name}. Buffer: ${batchMessages.length}. Next 'before': ${lastId}`);
        }

        if (batchMessages.length > 0) {
            console.log(`[History] Processing final remaining ${batchMessages.length} messages for #${channel.name}...`)
            totalAttempted += batchMessages.length
            const processedCount = await storeAndProcessBatch(batchMessages)
            totalProcessed += processedCount!
        }

        console.log(`[History] Finished fetching and processing messages from #${channel.name}. Total attempted: ${totalAttempted}. Total processed: ${totalProcessed}.`)
        return { totalAttempted, totalProcessed }
    } catch (error) {
        console.error(`[History] Error fetching and processing messages from #${channel.name}: ${error}`)
        return { totalAttempted, totalProcessed }
    }
}

function preprocessMessages(messages: Message[]): Omit<Data, "embedding">[] {

    const output: Omit<Data, "embedding">[] = messages.map((msg) => ({
        discord_message_id: msg.id,
        user_id: msg.author.id,
        channel_id: msg.channelId,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        user_name: msg.author.username,
        attachment_urls: Array.from(msg.attachments.values()).map((attachment) => attachment.url),
    }))

    return output
}

async function saveChannelHistory(
    channel: TextChannel,
    outputPath: string
): Promise<void> {
    try {
        console.log(`Starting to fetch messages from #${channel.name}...`)
        const messages = await fetchMessages(channel)
        console.log(`Fetched ${messages.length} messages from #${channel.name}.`)

        const output: Omit<Data, "embedding">[] = messages.reverse().map((msg) => ({
            discord_message_id: msg.id,
            user_id: msg.author.id,
            channel_id: msg.channelId,
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
            user_name: msg.author.username,
            attachment_urls: Array.from(msg.attachments.values()).map((attachment) => attachment.url),
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

    if (!message.guild || !message.channel || !message.content || !message.author) return
    if (message.author.bot) return

    if (message.content === "!help") {
        message.reply({ content: "!index - Index all text channels in the server.\n!save-chat - Save all chat history in the server to a db.\n!help - Show this message." })
        return
    }

    if (message.content === "!index") {

        if (message.author.username !== "monakecil") {
            message.reply({ content: "monakecil is the only master I serve.", allowedMentions: { repliedUser: false } })
            return
        }


        if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`User ${message.author.tag} tried to use !index without Admin permissions.`)
            try {
                await message.reply({ content: "Sorry, you need Administrator permissions to run the indexing command.", allowedMentions: { repliedUser: false } })
            } catch (replyError) {
                console.error("Failed to send permission error reply:", replyError)
            }
            return
        }

        const author = message.author
        const initialChannel = message.channel as TextChannel
        const guild = message.guild

        console.log(`Initiating indexing for ${guild.name}...`)

        try {
            await message.delete();
        } catch (delError) {
            console.warn("Failed to delete !index command message:", delError);
        }

        try {
            await author.send(`Starting indexing process for all accessible text channels in **${guild.name}**. This might take a very long time! I'll DM you again when it's complete.`)
        } catch (dmError) {
            console.warn(`Could not send start DM to ${author.tag}. Sending message in channel #${initialChannel.name}`)
            try {
                await initialChannel.send(`Starting indexing process for all channels, initiated by ${author.tag}. This might take a while...`)
            } catch (channelMsgError) {
                console.error("Failed to send start message in channel:", channelMsgError)
            }
        }

        let channelsProcessed = 0
        let totalMessagesFetchedOverall = 0
        let totalUserMessagesStoredOverall = 0
        const processingStartTime = Date.now()

        for (const channel of guild.channels.cache.values()) {
            if (channel instanceof TextChannel &&
                guild.members.me?.permissionsIn(channel).has(PermissionsBitField.Flags.ViewChannel) &&
                guild.members.me?.permissionsIn(channel).has(PermissionsBitField.Flags.ReadMessageHistory)) {
                console.log(`[Index Command] Processing channel #${channel.name} (${channel.id})`);
                try {
                    const result = await fetchAndStoreChannelHistory(channel);
                    channelsProcessed++;
                    totalMessagesFetchedOverall += result.totalAttempted;
                    totalUserMessagesStoredOverall += result.totalProcessed;
                    console.log(`[Index Command] Finished channel #${channel.name}. Fetched: ${result.totalAttempted}, Stored (User): ${result.totalProcessed}`);
                } catch (channelError) {
                    console.error(`[Index Command] Failed to process channel #${channel.name}:`, channelError);
                    try { await author.send(`Error processing channel #${channel.name}. Check logs.`); } catch { }
                }
            } else {
                console.log(`[Index Command] Skipping channel ${channel.name} (${channel.id}) - Not a viewable text channel.`);
            }
        }

        const processingEndTime = Date.now();
        const durationSeconds = ((processingEndTime - processingStartTime) / 1000).toFixed(2);
        const completionMessage = `Finished indexing **${guild.name}**!
Processed ${channelsProcessed} channels.
Fetched approximately ${totalMessagesFetchedOverall} total messages.
Stored ${totalUserMessagesStoredOverall} user messages in the database.
Duration: ${durationSeconds} seconds.`;

        try {
            await author.send(completionMessage);
        } catch (dmError) {
            console.warn(`Could not send completion DM to ${author.tag}. Sending message in channel #${initialChannel.name}`);
            try {
                await initialChannel.send(completionMessage);
            } catch (channelMsgError) {
                console.error("Failed to send completion message in channel:", channelMsgError);
            }
        }
        console.log(`[Index Command] Indexing complete for guild ${guild.name}.`);
        return
    }

    if (message.content === "!save-chat" && message.member?.permissions.has("Administrator")) {

        if (message.author.username !== "monakecil") {
            message.reply({ content: "monakecil is the only master I serve.", allowedMentions: { repliedUser: false } })
            return
        }

        message.reply("Deprecated command, use !index instead.")
        return

        if (!(message.channel instanceof TextChannel)) return

        //const author = message.author
        //message.delete()

        //const outputDir = path.join(__dirname, `chat_logs/${message.guild?.name}`)
        //fs.mkdir(outputDir, { recursive: true }, (err) => {
        //    if (err) throw err;
        //})

        //const currentDate = new Date().toLocaleDateString("id-ID").replace(/\//g, "_")
        //const currentTime = new Date().toLocaleTimeString("id-ID").slice(0, 5).replace(/\./g, "_")
        //const dateTime = `${currentDate}-${currentTime}`

        //const fileName = `${message.channel.name}-${dateTime}.txt`
        //const outputPath = path.join(outputDir, fileName)

        //await author.send(`Saving chat history to ${outputPath}...`)
        //await author.send(`Fetching chat history from #${message.channel.name}...`)
        //const { totalAttempted, totalProcessed } = await fetchAndStoreChannelHistory(message.channel)
        //await author.send(`Chat history saved. Total attempted: ${totalAttempted}. Total processed: ${totalProcessed}.`)
        //await saveChannelHistory(message.channel, outputPath)
        //await author.send(`Chat history saved`)
        return
    }
})

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)
