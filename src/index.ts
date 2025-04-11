import {
    Collection,
    Events,
    GatewayIntentBits,
    Message,
    PermissionsBitField,
    TextChannel
} from "discord.js";
import Meng from "./types/Meng";
import * as dotenv from "dotenv";
import { getSimilarMessages, getUserMessagesHistory, storeAndProcessBatch } from "./dbClient";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in environment variables.")
}

const SERVER_ID = process.env.SERVER_ID || "840099499086970910"

const client = new Meng({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

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

client.on("messageCreate", async (message) => {

    if (!message.guild || !message.channel || !message.content || !message.author) return
    if (message.author.bot) return

    if (message.guild.id !== SERVER_ID) {
        message.reply({
            content: "I can only be used inside Teyvat.",
            allowedMentions: { repliedUser: false }
        })
        return
    }

    if (message.content === "!help") {
        if (message.author.username !== "monakecil") {
            message.reply({
                content: `
                !roastme-a - Get roasted based on your chat history.
                !roastme-b - Get roasted based on your chat history (different approach to context generation).
                !chat - Chat with Meng about any common topics.
                !help - Show this message.
                `,
                allowedMentions: { repliedUser: false }
            })
        } else {
            message.reply({
                content: `
                !index - Index all text channels in the server.
                !save-chat - Save all chat history in the server to a db.
                !similar - Find similar messages based on your query.
                !history - Show your chat history.
                !roastme-a - Get roasted based on your chat history.
                !roastme-b - Get roasted based on your chat history (different approach to context generation).
                !chat - Chat with Meng about any common topics.
                !help - Show this message.
                `,
                allowedMentions: { repliedUser: false }
            })
        }
    }

    if (message.content.startsWith("!chat")) {
        const contents = message.content.split("")
        const [command, query] = contents

        console.log(`[Chat] ${message.author.username} triggered chat command with query: ${query}`)

    }

    if (message.content === "!roastme-b") {
        const userId = message.author.id;
        const history = await getUserMessagesHistory(userId, 500);
        if (!history || history.length === 0) {
            message.reply({ content: "I can't roast you if you don't talk!", allowedMentions: { repliedUser: false } })
            return
        }

        const formattedHistory = history
            .map(msg => msg.content.trim())
            .filter(content => content.length > 0)
            .map(content => content.substring(0, 100))
            .join('\n')

        try {
            const getHistoryContextPrompt = `
                **Tugas Utama:** Analisis history chat Discord berikut dan ekstrak informasi kunci yang relevan untuk memahami konteks percakapan dan karakteristik pengguna.

                **Input:** History chat Discord (mungkin tidak lengkap atau berurutan).

                **Instruksi:**
                1.  **Identifikasi Topik Utama:** Apa topik atau aktivitas utama yang sedang dibicarakan dalam history chat ini?
                2.  **Identifikasi Pola/Kecenderungan Pengguna:** Berdasarkan cara pengguna berbicara atau apa yang mereka katakan, apakah ada pola atau kecenderungan yang menonjol? (Contoh: sering ragu-ragu, sangat antusias tentang topik X, sering menggunakan slang tertentu, dll.)
                3.  **Ringkasan Konteks:** Buat ringkasan singkat (1-2 kalimat) yang menjelaskan situasi atau konteks umum dari percakapan ini. Fokus pada apa yang paling penting untuk dipahami oleh orang luar.
                4.  **Bahasa Output:** Gunakan Bahasa Indonesia.
                5.  **Format Output:** Berikan output dalam format berikut (gunakan nilai aktual yang kamu identifikasi):
                    \`\`\`
                    Topik Utama: [Topik yang diidentifikasi]
                    Kecenderungan Pengguna: [Pola/kecenderungan yang diidentifikasi]
                    Ringkasan Konteks: [Ringkasan 1-2 kalimat]
                    \`\`\`

                **History Chat Discord:**
                ${formattedHistory}`;

            message.reply({
                content: "Menganalisis history chat...",
                allowedMentions: { repliedUser: false }
            })
            console.log("[Context] Analyzing history...")
            const contextAnalysis = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: getHistoryContextPrompt
            })
            if (!contextAnalysis.text) {
                message.reply({
                    content: "Sorry, I couldn't come up with a context right now. Try again later!",
                    allowedMentions: { repliedUser: false }
                })
                return
            }

            const context = contextAnalysis.text
            console.log("[Context] Got context")

            console.log("[Roast] Generating roast based on analysis...")
            
            const roastPrompt = `
                **Tugas Utama:** Buat sebuah roast/ejekan singkat (1-2 kalimat) yang lucu dan witty dalam Bahasa Indonesia untuk pengguna Discord berdasarkan analisis history chat mereka.

                **Input:** Analisis history chat yang mencakup topik utama, kecenderungan pengguna, dan ringkasan konteks.

                **Instruksi:**
                1.  **Fokus Roast:** Gunakan "Topik Utama" dan "Kecenderungan Pengguna" dari analisis sebagai inspirasi utama untuk roast.
                2.  **Tone:** Harus lucu, witty, dan terdengar seperti ejekan ringan antar teman. HINDARI penghinaan yang kasar atau jahat. "Unleash your limit" dalam kreativitas, bukan dalam kekasaran.
                3.  **Format:**
                    *   Langsung berikan roastnya saja. JANGAN tambahkan teks pembuka seperti "Oke, ini roastnya:".
                    *   JANGAN gunakan bullet points atau nomor.
                    *   Hasil akhir harus berupa satu blok teks singkat (ideal 1-2 kalimat).
                4.  **Bahasa:** Bahasa Indonesia informal/slang yang sesuai dengan konteks Discord.

                **Analisis History Chat:**
                ${context}

                **Contoh Output (Hanya Format):**
                "Dasar [ejekan berdasarkan kecenderungan], ngomongin [topik utama] mulu tapi [aksi kontras/lucu]."
                "Kalau soal [topik utama] aja semangat, giliran [hal lain] langsung jadi [ejekan berdasarkan kecenderungan]."

                **Buat Roast Sekarang:**
                `;

            const roast = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: roastPrompt
            })
            if (!roast.text) {
                message.reply({
                    content: "Sorry, I couldn't come up with a roast right now. Try again later!",
                    allowedMentions: { repliedUser: false }
                })
                return
            }

            message.reply({
                content: roast.text,
                allowedMentions: { repliedUser: false }
            })
        } catch (err) {
            console.error("Failed to get history context:", err)
            return
        }
    }

    if (message.content === "!roastme-a") {
        const userId = message.author.id
        const history = await getUserMessagesHistory(userId, 500)
        if (!history || history.length === 0) {
            message.reply({ content: "I can't roast you if you don't talk!", allowedMentions: { repliedUser: false } })
            return
        }

        // Format messages, trim each to 100 chars max and take only non-empty messages
        const formattedHistory = history
            .map(msg => msg.content.trim())
            .filter(content => content.length > 0)
            .map(content => content.substring(0, 100))
            .join('\n')

        try {

            const getHistoryContextPrompt = `Aku akan memberikanmu chat history dari seorang pengguna Discord. Tugasmu adalah menambahkan konteks agar chatnya menjadi lebih jelas. Misal: "chat: pengen sih main tapi agak males euy" di bubble chat ini jika historynya ga nyambung kamu bisa tambahin context misal "user mengajak main temannya." Ingat untuk hanya tambahkan konteks ke chat yang dirasa perlu. Berikan konteks dalam bahasa Indonesia. Jangan ubah chatnya, hanya append context di bagian atas chatnya. Ingat ini history chat discord, jadi ada kemungkinan besar user sedang chat dengan teman. Chat historynya:\n\n${formattedHistory}`;
            
            message.reply({
                content: "Tunggu bentar, ya.",
                allowedMentions: { repliedUser: false }
            });

            console.log("[Roast] Getting history context...")
            const context = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: getHistoryContextPrompt,
            });
            
            console.log("[Roast] Got history context, generating roast...")
            const roastPrompt = `Tolong buat roast/ejekan singkat dalam bahasa Indonesia untuk pengguna Discord ini berdasarkan chat history mereka. Be funny and creative! Unleash your limit. Jangan tambahkan apapun seperti "Oke ini beberapa roast untuk pengguna discord ini", langsung berikan roastnya saja. Jangan gunakan bullet points, bikinkan roastnya menjadi satu kesatuan kalimat. Chat history beserta contextnya:\n\n${context.text}\n\nBuat yang lucu, witty, menarik berdasarkan topik yang mereka bicarakan dan cara mereka ngobrol!`




            const roastResponse = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: roastPrompt
            });

            console.log("[Roast] Generated roast, replying...");
            
            if (!roastResponse.text) {
                message.reply({
                    content: "Sorry, I couldn't come up with a roast right now. Try again later!",
                    allowedMentions: { repliedUser: false }
                })
                return
            }

            if (roastResponse.text.length > 2000) {
                let chunks = []
                for (let i = 0; i < roastResponse.text.length; i += 2000) {
                    chunks.push(roastResponse.text.substring(i, i + 2000))
                    message.reply({
                        content: roastResponse.text.substring(i, i + 2000),
                        allowedMentions: { repliedUser: false }
                    })
                }
                return
            }
            
            message.reply({
                content: roastResponse.text,
                allowedMentions: { repliedUser: false }
            })
            return
        } catch (error) {
            console.error('Error generating roast:', error)
            message.reply({
                content: "Sorry, I couldn't come up with a roast right now. Try again later!",
                allowedMentions: { repliedUser: false }
            })
        }
    }

    if (message.content === "!history") {
        if (message.author.username !== "monakecil") {
            message.reply({
                content: "monakecil is the only master I serve.",
                allowedMentions: { repliedUser: false }
            })
            return
        }

        const userId = message.author.id
        const history = await getUserMessagesHistory(userId)
        if (!history) {
            message.reply({ content: "No chat history found.", allowedMentions: { repliedUser: false } })
            return
        }

        const formattedMessages = history.map((msg, index) => `${index + 1}. ${msg.content}`)
        const chunks: string[] = []
        let currentChunk = ""

        for (const msg of formattedMessages) {
            if (currentChunk.length + msg.length + 2 > 4000) { // Leave some buffer
                chunks.push(currentChunk)
                currentChunk = msg
            } else {
                currentChunk += (currentChunk ? "\n" : "") + msg
            }
        }
        if (currentChunk) chunks.push(currentChunk)

        // Send initial message
        await message.reply({ 
            content: `Chat history (${chunks.length} parts):`, 
            allowedMentions: { repliedUser: false } 
        })

        // Send each chunk as a separate message
        for (let i = 0; i < chunks.length; i++) {
            await message.channel.send({
                embeds: [{
                    title: `Chat History (Part ${i + 1}/${chunks.length})`,
                    description: chunks[i]
                }]
            })
        }
        return
    }

    if (message.content.startsWith("!similar")) {

        if (message.author.username !== "monakecil") {
            message.reply({ content: "monakecil is the only master I serve.", allowedMentions: { repliedUser: false } })
            return
        }

        console.log(`[Similar] Received query: ${message.content}`)

        try {
            const query = message.content.replace("!similar", "").trim()
            const similarMessages = await getSimilarMessages(query, message.author.id)
            console.log(`[Similar] Found ${similarMessages?.length || 0} similar messages`)
            if (!similarMessages) {
                message.reply({ content: "No similar messages found.", allowedMentions: { repliedUser: false } })
                return
            }
            // Get channel name from channel_id
            message.reply({ content: "Similar messages:", allowedMentions: { repliedUser: false }, embeds: [{
                title: "Similar Messages",
                description: similarMessages.map((msg, index) => `${index + 1}. <@${msg.user_id}>: [${msg.content}](https://discord.com/channels/${SERVER_ID}/${msg.channel_id}/${msg.discord_message_id})\n${new Date(msg.timestamp).toLocaleString()}`).join("\n\n")
            }] })
        } catch (error) {
            console.error("Failed to get similar messages:", error)
            message.reply({ content: "Failed to get similar messages.", allowedMentions: { repliedUser: false } })
        }
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
