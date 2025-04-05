# Meng

# Note
Make sure to set these environment variables:

```
DISCORD_TOKEN=<your token>
POSTGRES_HOST=<your host>
POSTGRES_PORT=<your port>
POSTGRES_USER=<your user>
POSTGRES_PASSWORD=<your password>
POSTGRES_DATABASE=<your database>
```

Database structure:
````
id uuid not null primary key default gen_random_uuid(),
discord_message_id text not null,
user_id text not null,
channel_id text not null,
content text,
timestamp text not null,
user_name text,
attachment_urls text[],
embedding vector(384) not null
```

Personalized discord bot for my server:
- Crawl the entire server history and save it to a vector database,
- utilize the vector database as a RAG system.
