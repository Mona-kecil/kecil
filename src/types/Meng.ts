import { Client, Collection, ClientOptions } from "discord.js";

export default class Meng extends Client {
  commands: Collection<string, any>

  constructor(options: ClientOptions) {
    super(options)
    this.commands = new Collection()
  }
}
