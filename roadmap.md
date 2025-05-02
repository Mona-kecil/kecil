# Roadmap

## Chat Features

-   [ ] Implement image parsing
    -   [ ] Convert every image to WebP format
    -   [ ] Set max size of the image to 20MB
-   [x] Implement chat command
    -   [x] Structure: `@bot chat <query>`
    -   [x] Auto create a thread for the chat
        -   [x] Only respond chat from the user who triggered the command
        -   [x] Allow user to reply to the thread without mentioning the bot again.
    -   [x] Use entire thread history (from the bot and user) as context for the chat
-   [x] Implement preferences that will affect how Meng responds to them
    -   [x] Create a table user_preferences(user_id, occupation, traits, additional_informations)
    -   [x] Allow user to set their occupation
    -   [x] Allow user to set selected traits
    -   [x] Allow user to set additional informations
-   [ ] Implement document parsing
    -   [ ] Convert documents to PDF format
    -   [ ] Set max size of the document to 50MB
    -   [ ] Allow user to upload a document to cloud and link it to the chat
