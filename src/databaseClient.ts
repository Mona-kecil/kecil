//import { Pool } from "pg";
//import * as dotenv from "dotenv";
//import { Data } from "./types/Data";
//dotenv.config();
//
//const pgHost = process.env.POSTGRES_HOST
//const pgPort = process.env.POSTGRES_PORT
//const pgUser = process.env.POSTGRES_USER
//const pgPassword = process.env.POSTGRES_PASSWORD
//const pgDatabase = process.env.POSTGRES_DATABASE
//
//if (!pgHost || !pgPort || !pgUser || !pgPassword || !pgDatabase) {
//    throw new Error("Either Postgres host, port, user, password, or database not found in environment variables.")
//}
//
//const connectionString =
//    `postgres://${pgUser}:${encodeURIComponent(pgPassword)}@${pgHost}:${pgPort}/${pgDatabase}`;
//
//
//async function getEmbeddingFromApiBatch(texts: string[]): Promise<number[][] | null> {
//    if (!texts || texts.length === 0) {
//        throw new Error("No texts provided for embedding.")
//    }
//
//    const url = "http://localhost:5000/embed-batch"
//    const payload = { texts: texts }
//    console.log(`Requesting batch embedding for ${texts.length} from ${url}`)
//
//    try {
//        const response = await axios.post<{ embeddings: number[][] }>(
//            url,
//            payload,
//            {
//                headers: { 'Content-Type': 'application/json' }
//            }
//        )
//
//        if (response.status !== 200) {
//            console.error(`Error ${response.status} from ${url}: ${response.statusText}`)
//            return Promise.resolve(null)
//        }
//
//        if (!response.data || !Array.isArray(response.data.embeddings)) {
//            console.error(`Invalid response from ${url}: ${JSON.stringify(response.data)}`)
//            return Promise.resolve(null)
//        }
//
//        if (response.data.embeddings.length !== texts.length) {
//            console.error(`Invalid response from ${url}: Expected ${texts.length} embeddings, got ${response.data.embeddings.length}`)
//            return Promise.resolve(null)
//        }
//
//        console.log(`Received batch embedding for ${texts.length} from ${url}`)
//        return Promise.resolve(response.data.embeddings)
//    } catch (error) {
//        if (axios.isAxiosError(error)) {
//            const axiosError = error as AxiosError
//            console.error(`Error ${axiosError.response?.status} from ${url}: ${axiosError.response?.statusText}`)
//            axiosError.response?.data && console.error(axiosError.response?.data)
//        } else {
//            console.error(`Unexpected error from ${url}: ${error}`)
//        }
//
//        return Promise.resolve(null)
//    }
//}
//
//export async function storeAndProcessBatch(messagesBatch: Omit<Data, "embedding">[]): Promise<number | void> {
//    if (!messagesBatch || messagesBatch.length === 0) {
//        throw new Error("No messages provided for storage and processing.")
//    }
//
//    const batchSize = messagesBatch.length
//    console.log(`Processing ${batchSize} messages in batch...`)
//
//    const contentsToEmbed = messagesBatch.map((message) => message.content || "")
//    const embeddings = await getEmbeddingFromApiBatch(contentsToEmbed)
//
//    if (!embeddings) {
//        console.error("Failed to get embeddings from API. Skipping batch")
//        return
//    }
//
//    if (embeddings.length !== batchSize) {
//        console.error(`Expected ${batchSize} embeddings, got ${embeddings.length}. Skipping batch`)
//        return
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
