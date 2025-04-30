// How to use
// node deploySlashCommandHandler.js [command]
// command:
// - reg/register
// - del/delete
// - help

import { REST, Routes } from "discord.js";
import { loadedCommands } from "./slashCommandHandler";
import * as dotenv from "dotenv";
import { IS_DEV } from "../../config";
dotenv.config();

const command = process.argv[2];
const TOKEN = IS_DEV
    ? process.env.DISCORD_DEV_TOKEN
    : process.env.DISCORD_TOKEN;
const CLIENT_ID = IS_DEV ? "918108633684922398" : "1356142514519806143";
const SERVER_ID = IS_DEV ? "1063070984409727037" : "840099499086970910";

if (typeof TOKEN === "undefined") {
    throw new Error("Discord token not found");
}

async function main() {
    if (typeof TOKEN === "undefined") {
        throw new Error("Discord token not found");
    }
    const rest = new REST().setToken(TOKEN);
    switch (command.toLowerCase()) {
        case "reg":
        case "register":
            await registerSlashCommands(rest);
            break;
        case "del":
        case "delete":
            await deleteSlashCommands(rest);
            break;
        case "h":
        case "help":
            console.log(
                "How to use\nnode deploySlashCommandHandler.js [command]\ncommand:\n- reg/register\n- del/delete\n- help"
            );
            break;
        default:
            console.log(
                "Invalid command. Use 'reg' or 'del' to register or delete slash commands."
            );
    }

    console.log(`Client ID: ${CLIENT_ID}\nServer ID: ${SERVER_ID}`);
}

async function registerSlashCommands(rest: REST) {
    const slashCommands = await loadedCommands;
    if (!slashCommands) {
        console.error("[Client] Failed to load slash commands");
        return;
    }

    const commandsToDeploy = slashCommands.map((command) =>
        command.data.toJSON()
    );

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID),
            {
                body: commandsToDeploy,
            }
        );
        console.log(
            `[Client] Successfully registered ${commandsToDeploy.length} slash commands`
        );
    } catch (error) {
        console.error("[Client] Failed to register slash commands:", error);
    }
}

async function deleteSlashCommands(rest: REST) {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID)
        );
        console.log(`[Client] Successfully deleted all slash commands`);
    } catch (error) {
        console.error("[Client] Failed to delete slash commands:", error);
    }
}

main();
