# Roadmap

## Chat Features

-   [ ] Implement image parsing
-   [x] Implement chat command
    -   [x] Structure: `@bot chat <query>`
    -   [x] Auto create a thread for the chat
        -   [x] Only respond chat from the user who triggered the command
        -   [x] Allow user to reply to the thread without mentioning the bot again.
    -   [x] Use entire thread history (from the bot and user) as context for the chat
-   [ ] Implement preferences that will affect how Meng responds to them
    -   [x] Create a table user_preferences(user_id, occupation, traits, additional_informations)
    -   [ ] Allow user to set their occupation
    -   [ ] Allow user to set selected traits
    -   [ ] Allow user to set additional informations
-   [ ] Implement document parsing
    -   [ ] Convert every document to PDF format
    -   [ ] Pass the PDF to Meng
    -   [ ] Meng now have context of the document
