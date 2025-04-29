import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? null;
if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not found in environment variables.");
}

const is_dev = process.argv[2] ?? null;

let client_id: string | undefined;
let server_id: string | undefined;
let token: string | undefined;

if (is_dev && is_dev.toUpperCase() === "DEV") {
    client_id = "918108633684922398"; // 小猫 (Xiao Mao)
    server_id = "1063070984409727037";
    token = process.env.DISCORD_DEV_TOKEN;
} else {
    client_id = "1356142514519806143"; // Meng
    server_id = process.env.SERVER_ID ?? "840099499086970910"; // Teyvat's server ID
    token = process.env.DISCORD_TOKEN;
}

if (typeof token === "undefined") {
    throw new Error("Discord bot token not found in environment variables.");
}

export const AI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
export const TOKEN = token as string;
export const SERVER_ID = server_id as string;
export const CLIENT_ID = client_id as string;
export const IS_DEV = is_dev as string | null;
