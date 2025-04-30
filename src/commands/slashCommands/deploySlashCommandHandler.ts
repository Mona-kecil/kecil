// How to use
// node deploySlashCommandHandler.js [command]
// command:
// - reg/register
// - del/delete
// - help

import { REST, Routes } from "discord.js";
import { loadedCommands } from "./slashCommandHandler";
import * as dotenv from "dotenv";
dotenv.config();

const command = process.argv[2];
const IS_DEV = process.argv[3]?.toUpperCase() === "DEV";
const TOKEN = IS_DEV ? process.env.DISCORD_DEV_TOKEN : process.env.DISCORD_TOKEN;
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
            await registerSlashCommands(rest, IS_DEV ? "Xiao Mao" : "Meng", IS_DEV ? "Kocheng Kecil" : "Teyvat");
            break;
        case "del":
        case "delete":
            await deleteSlashCommands(rest, IS_DEV ? "Xiao Mao" : "Meng", IS_DEV ? "Kocheng Kecil" : "Teyvat");
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

    const clientName = CLIENT_ID === "918108633684922398" ? "Xiao Mao" : "Meng";
    const serverName = SERVER_ID === "1063070984409727037" ? "Kocheng Kecil" : "Teyvat";
    console.log(`Client: ${clientName} (ID: ${CLIENT_ID})\nServer: ${serverName} (ID: ${SERVER_ID})`);
}

async function registerSlashCommands(rest: REST, clientName: string, serverName: string) {
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
            `[Client] Successfully registered ${commandsToDeploy.length} slash commands for ${clientName} (ID: ${CLIENT_ID}) Server: ${serverName} (ID: ${SERVER_ID})\n\n`
        );
    } catch (error) {
        console.error("[Client] Failed to register slash commands:", error);
    }
}

async function deleteSlashCommands(rest: REST, clientName: string, serverName: string) {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, SERVER_ID)
        );
        console.log(`[Client] Successfully deleted all slash commands for ${clientName} (ID: ${CLIENT_ID}) Server: ${serverName} (ID: ${SERVER_ID})\n\n`);
    } catch (error) {
        console.error("[Client] Failed to delete slash commands:", error);
    }
}

main();
