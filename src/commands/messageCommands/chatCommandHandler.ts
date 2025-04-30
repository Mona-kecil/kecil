import { Collection, Message, ThreadChannel } from "discord.js";
import { AI, CLIENT_ID } from "../../config";
import { Content, Part } from "@google/genai";
import { ThreadAutoArchiveDuration } from "discord.js";
import { getThread, getUserPreferences, storeThread } from "../../dbClient";

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
            handleGenerateResponse(query, message.author.id, message.author.tag, undefined),
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
    const response = await handleGenerateResponse(
        query,
        message.author.id,
        message.author.tag,
        chatHistory!
    );
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

        return chatHistory;
    } catch (error) {
        console.error(
            `[History] Error fetching messages from #${channel.name}: ${error}`
        );
        return null;
    }
}

async function handleSendLongMessage(thread: ThreadChannel, message: string) {
    let start = 0;
    while (start < message.length) {
        let end = Math.min(start + 2000, message.length);
        if (end < message.length) {
            const lastSpace = message.lastIndexOf(" ", end);
            if (lastSpace > start) {
                end = lastSpace;
            }
        }
        const chunk = message.substring(start, end);
        await thread.send(chunk);
        start = end;
    }
}

async function handleCreateNewThread(
    message: Message<boolean>
): Promise<ThreadChannel> {
    const thread = await message.startThread({
        name: "...",
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
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
    authorId: string,
    authorUsername: string,
    history?: Content[]
): Promise<string> {

    const userPreferences = await getUserPreferences(authorId);
    
    let prompt = `You are Meng, an AI assistant powered by the Gemini-2.0-flash model. You are here to help and engage in conversation. Feel free to mention that you're using the Gemini-2.0-flash model if asked about what are you.`;

    prompt += ` Your main platform is Discord chat. You should always use Discord's style of markdown.`;

    prompt += ` Your father is <@871768827250217052> and your mother is <@818457415560855592>. Feel free to mention them if asked about your parent or your creator.`;

    prompt += ` If you are generating a code, always make it Prettier formatted and print width should be 80 characters. Also enclose the code in a code block with language specified.`;

    prompt += ` You are speaking with ${authorUsername}.`;

    if (userPreferences && userPreferences.occupation) {
        prompt += ` The user's occupation is ${userPreferences.occupation}.`;
    }

    if (userPreferences && userPreferences.traits) {
        prompt += ` The user has requested that you behave in the following ways: ${userPreferences.traits.join(', ')}.`;
    }

    if (userPreferences && userPreferences.additional_informations) {
        prompt += ` Additional information about the user: ${userPreferences.additional_informations}. Use these informations to provide more personalized responses.`
    }

    prompt += ` Always strive to be helpful, respectful, and engaging in your interactions.`;

    prompt += ` Do not use emoji at all.`;

    prompt += ` Try to use informal language, for example "kamu" instead of "anda" and "meng" (to call yourself) instead of "saya" if you're speaking in Indonesian where "saya" and "anda" is very formal.`;

    prompt += ` If user asked you to change your style of speaking, just change your style of speaking. DON'T add "okay here you go" and "Okay hope you like it" or anything else.`;

    prompt += ` If you are not sure about something, feel free to say "I don't know" or "I'm not sure".`;

    const contents: Content[] = [{ role: "user", parts: [{ text: query }] }];

    if (history?.length) {
        contents.unshift(...history);
    }

    const genModel = await AI.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: {
            systemInstruction: prompt,
        },
    });

    return genModel.text || "";
}
