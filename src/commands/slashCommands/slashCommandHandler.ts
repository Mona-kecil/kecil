import fs from "node:fs";
import path from "node:path";
import { Collection } from "discord.js";

import Command from "../../types/Command";

async function loadSlashCommands(): Promise<Collection<string, any> | null> {
    const commands = new Collection<string, any>();

    const commandsPath = path.join(__dirname, "commands");

    try {
        const commandFiles = fs
            .readdirSync(commandsPath)
            .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

        console.log(
            `Found ${commandFiles.length} command files in ${commandsPath}`
        );

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath) as Command;

                if (!command.data || !command.execute) {
                    console.warn(
                        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
                    );
                    continue;
                }

                commands.set(command.data.name, command);
                console.log(`-> Loaded command: ${command.data.name}`);
            } catch (importError) {
                console.error(
                    `[ERROR] Could not import command file ${filePath}:`,
                    importError
                );
            }
        }

        return commands;
    } catch (err) {
        console.error(
            `[ERROR] Could not read commands directory ${commandsPath}:`,
            err
        );
        return null;
    }
}

export const loadedCommands = loadSlashCommands();
