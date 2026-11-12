# miniu

A chat agent with one tool (web search). It answers fast, cites its sources, and remembers what you asked and when.
Architecture and decisions are in [DESIGN.md](DESIGN.md).

- `server/` Node + Express (plain JavaScript), Vercel AI SDK, Groq, Tavily, plus Neon, Cohere and Pinecone for memory
- `client/` Next.js + shadcn chat UI (sidebar of chats, markdown answers, source and memory badges)

## Run it

You need Node 20+.

```bash
npm install
cp .env.example server/.env     # then fill in the keys
npm run dev
```

`npm install` at the root also installs the server and the client. `npm run dev` starts both:

- app: http://localhost:3000
- server: http://localhost:8000 (`curl localhost:8000/health` prints `{"ok":true}`)

The client needs no env file. It calls http://localhost:8000 unless `NEXT_PUBLIC_API_URL` is set.

## Keys (`.env.example`)

| Variable | What it is | Needed for |
|---|---|---|
| `GROQ_API_KEY` | Groq API key | chat |
| `TAVILY_API_KEY` | Tavily API key | web search |
| `DATABASE_URL` | Neon Postgres connection string | memory |
| `COHERE_API_KEY` | Cohere key (embeddings) | memory |
| `PINECONE_API_KEY` | Pinecone key | memory |
| `PINECONE_INDEX_NAME` | a plain dense index, 1024 dimensions, cosine (not a document-schema index) | memory |
| `PORT` | server port, default 8000 | optional |
| `CLIENT_ORIGIN` | client url for CORS, default http://localhost:3000 | optional |

Without the memory keys the chat still works, it just has no memory. The Neon tables are created when the server starts.

## What to try

1. `When is the GTA VI release date?` shows the search, `[1]` citations and source badges.
2. Open a new chat and ask `Did we talk about GTA VI?`. It answers from memory, with the date, and does not search.
3. Ask `Did we talk about GTA VI? Any updates since?`. It searches once and says whether it changed.
4. `What did I ask yesterday?`, `on Monday`, `last week Tue` or `on 3 November` read that day from your saved messages.
5. `Who won the match yesterday?` still searches the web, because it is not about your own chats.

## How it is laid out

```
server/src
  routes, controllers      HTTP only (zod checks the body)
  services                 chat (startChat), recall (getRecall), memory, prompt, webSearch
  tools                    the one tool: webSearch
  lib                      db (Neon), embeddings (Cohere), vectorStore (Pinecone), dateRange, cache
client
  app/chat/[chatId]        one URL per chat
  components/chat          chat, sidebar shell, markdown, source and memory badges
```

Each user is an anonymous id kept in the browser (`localStorage`). Each user has their own Pinecone namespace, and every database read goes through that user's chats.

Other commands: `npm run dev --prefix server`, `npm run dev --prefix client`, `npm run lint --prefix client`.
