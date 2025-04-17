import { Message } from "discord.js";
import { AI } from "../../config";
import { Chat } from "@google/genai";
import sendLongMessage from "../../utils/sendLongMessage";

async function generateTitle(query: string, model: string): Promise<string> {
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

async function generateResponse(chat: Chat, query: string): Promise<string> {
    const genModel = await chat.sendMessage({
      message: query,
      config: {
        maxOutputTokens: 3500
      }
    });
    return genModel.text || "";
}

async function parseImage() {
  throw new Error("Not implemented yet.")
}

export default async function chatCommandHandler(message: Message<boolean>, query: string, model: string = "gemini-2.0-flash") {
    try {

      const chat = AI.chats.create({
        model: model,
        history: []
      });

        const thread = await message.startThread({
            name: 'Processing...',
            autoArchiveDuration: 60
        });

        const [title, response] = await Promise.all([
            generateTitle(query, model),
            generateResponse(chat, query)
        ]);

        await thread.setName(title);
        await sendLongMessage(thread, response);

        return thread;
    } catch (error) {
        console.error('Error in chat command:', error);
        throw error;
    }
}
