import axios, { AxiosError } from "axios";

const apiUrl = "http://localhost:5000/embed-batch"

export async function textsToEmbedding(texts: string[]): Promise<number[][] | null> {

    if (!texts || texts.length === 0) {
        throw new Error("No texts provided for embedding.")
    }

    const payload = { texts: texts }
    console.log(`Requesting batch embedding for ${texts.length} from ${apiUrl}`)

    try {
        const response = await axios.post<{ embeddings: number[][] }>(
            apiUrl,
            payload
        )

        if (response.status !== 200) {
            console.error(`Error ${response.status} from ${apiUrl}: ${response.statusText}`)
            return Promise.resolve(null)
        }

        if (!response.data || !Array.isArray(response.data.embeddings)) {
            console.error(`Invalid response from ${apiUrl}: ${JSON.stringify(response.data)}`)
            return Promise.resolve(null)
        }

        if (response.data.embeddings.length !== texts.length) {
            console.error(`Invalid response from ${apiUrl}: Expected ${texts.length} embeddings, got ${response.data.embeddings.length}`)
            return Promise.resolve(null)
        }

        console.log(`Received batch embedding for ${texts.length} from ${apiUrl}`)
        return Promise.resolve(response.data.embeddings)
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError
            console.error(`Error ${axiosError.response?.status} from ${apiUrl}: ${axiosError.response?.statusText}`)
            axiosError.response?.data && console.error(axiosError.response?.data)
        } else {
            console.error(`Unexpected error from ${apiUrl}: ${error}`)
        }

        return Promise.resolve(null)
    }

}
