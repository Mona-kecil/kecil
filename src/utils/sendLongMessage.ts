import { Message, OmitPartialGroupDMChannel } from "discord.js";

export default async function sendLongMessage(message: OmitPartialGroupDMChannel<Message<boolean>>, content: string) {
  if (content.length < 2000) {
    message.channel.send({
      content,
      allowedMentions: {repliedUser: false}
    })
    return
  }

  const chunks: string[] = []
  for (let i = 0; i < content.length; i += 2000) {
    chunks.push(content.slice(i, i + 2000))
  }

  for (const chunk of chunks) {
    message.channel.send({
      content: chunk,
      allowedMentions: {repliedUser: false}
    })
  }
}