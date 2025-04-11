import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config()

const IS_DEV: string | undefined = process.argv[2];
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SERVER_ID = process.env.SERVER_ID || "840099499086970910";

let CLIENT_ID: string;
let TOKEN: string | undefined;
if (IS_DEV && IS_DEV.toUpperCase() === "DEV") {
    TOKEN = process.env.DISCORD_DEV_TOKEN;
    CLIENT_ID = "918108633684922398"; // Xiao Mao
} else {
    TOKEN = process.env.DISCORD_TOKEN;
    CLIENT_ID = "1356142514519806143"; // Meng
}

if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not found in environment variables.");
}

if (!TOKEN) {
    throw new Error("Discord bot token not found in environment variables.");
}

const AI = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

export {
    TOKEN,
    IS_DEV,
    AI,
    SERVER_ID,
    CLIENT_ID
};