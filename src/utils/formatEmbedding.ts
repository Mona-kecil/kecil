export default async function formatEmbedding(embedding: number[]): Promise<string> {
  return `[${embedding.join(',')}]`
}