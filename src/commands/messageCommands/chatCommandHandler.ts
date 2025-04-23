import { Message, PublicThreadChannel } from "discord.js";
import { AI } from "../../config";
import { Chat } from "@google/genai";
import { ThreadAutoArchiveDuration } from "discord.js";
import { getThread, storeThread } from "../../dbClient";

enum role {
  user = "user",
  model = "model"
};

export default async function chatCommandHandler(message: Message<boolean>, query: string, model: string = "gemini-2.0-flash") {
    const chat = AI.chats.create({
      model: model,
      history: []
    });

    const isThread = message.channel.isThread();

    if (!isThread) {

      const [thread, title, response] = await Promise.all([
        handleCreateNewThread(message),
        handleGenerateTitle(query, model),
        handleGenerateResponse(chat, query),
      ]);

      const threadId = thread.id;
      const authorId = message.author.id;
      await storeThread(threadId, authorId);

      await thread.setName(title);
      await handleSendLongMessage(thread, response)
      return;
    }

    const threadMetadata = await getThread(message.channelId);
    if (!threadMetadata) {
      console.log(`Thread ${message.channelId} not found`)
      return;
    }
    // The one who triggered the thread creation
    if (message.author.id !== threadMetadata.author_id) {
      console.log(`User ${message.author.id} is not the owner of thread ${message.channelId}`) 
      return;
    }
    console.log(`Generating response for thread ${message.channelId}`)
    const response = await handleGenerateResponse(chat, query);
    await handleSendLongMessage(message.channel as PublicThreadChannel, response)
}

async function handleSendLongMessage(thread: PublicThreadChannel, message: string) {
  for (let i = 0; i < message.length; i += 2000) {
    await thread.send(message.substring(i, i + 2000))
  }
}

async function handleCreateNewThread(message: Message<boolean>): Promise<PublicThreadChannel> {
  const thread = await message.startThread({
    name: '...',
    autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays,
  });
  return thread;
}

async function handleGenerateTitle(query: string, model: string): Promise<string> {
    const prompt = `Generate a concise title (max 4-5 words) for this query: "${query}"`;
    
    const result = await AI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "Generate a concise title for the given prompt. Do not include anything else other than the title. Do not say anything else like 'title: ' or 'here is the title:'. If the query is in another language, generate the title in the same language."
      }
    });
    const title = result.text?.trim() || "";
    
    return title.length > 100 ? title.substring(0, 97) + '...' : title;
}

async function handleGenerateResponse(chat: Chat, query: string): Promise<string> {
    const genModel = await chat.sendMessage({
      message: query,
      config: {
        maxOutputTokens: 2048
      }
    });
    return genModel.text || "";
}