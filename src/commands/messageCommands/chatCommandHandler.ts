import { Collection, Message, ThreadChannel } from "discord.js";
import { AI, CLIENT_ID } from "../../config";
import { Content, Part } from "@google/genai";
import { ThreadAutoArchiveDuration } from "discord.js";
import { getThread, storeThread } from "../../dbClient";

export default async function chatCommandHandler(
    message: Message<boolean>,
    query: string,
    model: string = "gemini-2.0-flash"
) {
    if (!message.channel.isThread()) {
        // This means user initiates a new chat command, no need to fetch chat history first.

        const [thread, title, response] = await Promise.all([
            handleCreateNewThread(message),
            handleGenerateTitle(query, model),
            handleGenerateResponse(query, undefined),
        ]);

        const threadId = thread.id;
        const authorId = message.author.id;
        await storeThread(threadId, authorId);

        await thread.setName(title);
        await handleSendLongMessage(thread, response);
        return;
    }

    const threadMetadata = await getThread(message.channelId);
    if (!threadMetadata) {
        return;
    }

    if (message.author.id !== threadMetadata.author_id) {
        return;
    }

    // This means user is replying to an existing thread managed by Meng
    const chatHistory = await handleConstructChatHistory(
        message.channel,
        message.author.id
    );
    const response = await handleGenerateResponse(query, chatHistory!);
    await handleSendLongMessage(message.channel, response);
}

async function handleConstructChatHistory(
    channel: ThreadChannel,
    authorId: string
): Promise<Content[] | null> {
    const chatHistory: Content[] = [];

    try {
        const messages: Collection<
            string,
            Message<boolean>
        > = await channel.messages.fetch({
            limit: 100,
        });

        const initialMessage = await channel.fetchStarterMessage();

        const messagesArray = Array.from(messages.values())
            .filter(
                (message) =>
                    message.author.id === authorId ||
                    message.author.id === CLIENT_ID
            )
            .filter((message) => message.content.length > 0)
            .reverse();

        messagesArray.unshift(initialMessage!);

        for (const message of messagesArray) {
            const parts: Part[] = [];
            if (message.content) {
                parts.push({ text: message.content });
            }
            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    parts.push({
                        fileData: {
                            fileUri: attachment.url,
                            mimeType: attachment.contentType!,
                        },
                    });
                }
            }
            chatHistory.push({
                role: message.author.id === CLIENT_ID ? "model" : "user",
                parts,
            });
        }

        console.log(
            `[History] Constructed chat history for #${
                channel.name
            }: ${chatHistory
                .map(
                    (message) =>
                        `${message.role}: ${message.parts
                            ?.map((part) => part.text)
                            .join("")}`
                )
                .join("\n")}`
        );

        return chatHistory;
    } catch (error) {
        console.error(
            `[History] Error fetching messages from #${channel.name}: ${error}`
        );
        return null;
    }
}

async function handleSendLongMessage(thread: ThreadChannel, message: string) {
    for (let i = 0; i < message.length; i += 2000) {
        await thread.send(message.substring(i, i + 2000));
    }
}

async function handleCreateNewThread(
    message: Message<boolean>
): Promise<ThreadChannel> {
    const thread = await message.startThread({
        name: "...",
        autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
    });
    return thread;
}

async function handleGenerateTitle(
    query: string,
    model: string
): Promise<string> {
    const prompt = `Generate a concise title for this query: "${query}"`;

    const result = await AI.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            systemInstruction:
                "Generate a concise title for the given prompt. Do not include anything else other than the title. Do not say anything else like 'title: ' or 'here is the title:'. If the query is in another language, generate the title in the same language.",
        },
    });
    const title = result.text?.trim() || "";

    return title.length > 100 ? title.substring(0, 97) + "..." : title;
}

async function handleGenerateResponse(
    query: string,
    history?: Content[]
): Promise<string> {
    const contents: Content[] = [{ role: "user", parts: [{ text: query }] }];

    if (history?.length) {
        contents.unshift(...history);
    }

    const genModel = await AI.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
    });

    return genModel.text || "";
}
