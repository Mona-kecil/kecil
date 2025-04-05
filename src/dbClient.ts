import { Pool } from "pg";
import * as dotenv from "dotenv";
import { Data } from "./types/Data";
import { Message } from "discord.js";
import { textsToEmbedding } from "./api/textToEmbedding";
dotenv.config();

const pgHost = process.env.POSTGRES_HOST
const pgPort = process.env.POSTGRES_PORT
const pgUser = process.env.POSTGRES_USER
const pgPassword = process.env.POSTGRES_PASSWORD
const pgDatabase = process.env.POSTGRES_DATABASE

if (!pgHost || !pgPort || !pgUser || !pgPassword || !pgDatabase) {
    throw new Error("Either Postgres host, port, user, password, or database not found in environment variables.")
}

const pool = new Pool({
    user: pgUser,
    host: pgHost,
    database: pgDatabase,
    password: pgPassword,
    port: Number(pgPort)
})

export async function storeAndProcessBatch(messagesBatch: Message[]): Promise<number | void> {
    const valid = await validateBatch(messagesBatch)
    if (!valid) {
        console.error("Invalid batch. Skipping batch")
        return
    }

    const processed = await processBatch(messagesBatch)
    if (!processed) {
        console.error("Failed to process batch. Skipping batch")
        return
    }

    const stored = await storeBatch(processed)
    if (!stored) {
        console.error("Failed to store batch. Skipping batch")
        return
    }

    return stored
}

async function validateBatch(messagesBatch: Message[]): Promise<boolean> {
    if (!messagesBatch || messagesBatch.length === 0) {
        return Promise.resolve(false)
    }

    return Promise.resolve(true)
}

async function processBatch(messagesBatch: Message[]): Promise<Data[] | void> {
    console.log(`Processing ${messagesBatch.length} messages in batch...`)
    const texts = messagesBatch.map((message) => message.content || "")
    const embeddings = await textsToEmbedding(texts)
    if (!embeddings) {
        console.error("Failed to get embeddings from API. Skipping batch")
        return
    }

    if (embeddings.length !== messagesBatch.length) {
        console.error(`Expected ${messagesBatch.length} embeddings, got ${embeddings.length}. Skipping batch`)
        return
    }

    const batch: Data[] = messagesBatch.map((msg, index) => {
        return {
            discord_message_id: msg.id,
            user_id: msg.author.id,
            channel_id: msg.channelId,
            content: msg.content,
            timestamp: msg.createdAt.toISOString(),
            user_name: msg.author.username,
            attachment_urls: Array.from(msg.attachments.values()).map((attachment) => attachment.url),
            embedding: embeddings[index],
        }
    }).filter(row => row !== null)
    console.log(`Batch processed. Batch size: ${batch.length}`)

    return batch
}

async function storeBatch(batch: Data[]): Promise<number | null> {
    console.log(`Attempting to insert ${batch.length} rows into the database...`)

    let client;
    const query = `
        insert into messages (discord_message_id, user_id, channel_id, content, timestamp, user_name, attachment_urls, embedding)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (discord_message_id) do nothing
    `;

    const result = {
        rowCount: 0,
    }

    try {
        client = await pool.connect()
        console.log("Connected to Postgres")

        for (const row of batch) {
            const { discord_message_id, user_id, channel_id, content, timestamp, user_name, attachment_urls, embedding } = row

            // Convert the embedding array to the format pgvector expects
            const vectorString = `[${embedding.join(',')}]`

            const values = [
                discord_message_id,
                user_id,
                channel_id,
                content,
                timestamp,
                user_name,
                attachment_urls,
                vectorString  // Use the formatted string instead of the raw array
            ]

            try {
                await client.query(query, values)
                result.rowCount++
            } catch (error) {
                const pgError = error as { message: string; detail?: string; hint?: string; where?: string }
                console.error(`Error inserting row ${discord_message_id} into the database: ${pgError.message}`)
                console.error("Full error object:", pgError)
                if (pgError.detail) console.error("Error detail:", pgError.detail)
                if (pgError.hint) console.error("Error hint:", pgError.hint)
                if (pgError.where) console.error("Error location:", pgError.where)
            }
        }



    } catch (error) {
        console.error(`Error inserting rows into the database: ${error}`)
    } finally {
        if (client) {
            client.release()
        }

        if (result) {
            return result.rowCount
        }

        return null
    }
}

//export async function OLD_storeAndProcessBatch(messagesBatch: Omit<Data, "embedding">[]): Promise<number | void> {
//    if (!messagesBatch || messagesBatch.length === 0) {
//        throw new Error("No messages provided for storage and processing.")
//    }
//
//    const batchSize = messagesBatch.length
//    console.log(`Processing ${batchSize} messages in batch...`)
//
//    const contentsToEmbed = messagesBatch.map((message) => message.content || "")
//    //const embeddings = await getEmbeddingFromApiBatch(contentsToEmbed)
//
//    //if (!embeddings) {
//        console.error("Failed to get embeddings from API. Skipping batch")
//        return
//    }
//
//    //if (embeddings.length !== batchSize) {
//        //console.error(`Expected ${batchSize} embeddings, got ${embeddings.length}. Skipping batch`)
//        //return
//    }
//
//    const rowsToInsert: Data[] = messagesBatch.map((msg, index) => {
//        return {
//            discord_message_id: msg.discord_message_id,
//            user_id: msg.user_id,
//            channel_id: msg.channel_id,
//            content: msg.content,
//            timestamp: msg.timestamp,
//            user_name: msg.user_name,
//            attachment_urls: msg.attachment_urls,
//            embedding: embeddings[index],
//        };
//
//    }).filter(row => row !== null)
//
//    console.log(`Attempting to insert ${rowsToInsert.length} rows into the database...`)
//    const { error } = await supabase
//        .from("messages")
//        .upsert(
//            rowsToInsert as any,
//            {
//                onConflict: 'discord_message_id',
//                ignoreDuplicates: true
//            }
//        )
//
//    if (error) {
//        console.error(`Error inserting rows into the database: ${error.message}`)
//        return
//    }
//
//    console.log(`Successfully inserted ${rowsToInsert.length} rows into the database.`)
//    return rowsToInsert.length
//}
