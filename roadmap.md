# Roadmap

## Chat Features
- [ ] Implement image parsing
- [x] Implement chat command
  - [ ] Structure: `@bot chat <query>`
  - [ ] Auto create a thread for the chat
    - [ ] Only respond chat from the user who triggered the command
    - [ ] Allow user to reply to the thread without mentioning the bot again.
  - [ ] Use entire thread history (from the bot and user) as context for the chat