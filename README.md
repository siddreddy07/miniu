# miniu

A chat agent with one tool (web search) that answers fast, cites its sources, and remembers what you asked and when.
See `design.md` for the architecture and decisions, and `prompts.md` for the prompt log.

- `server/` Node + Express (plain JavaScript), Vercel AI SDK, Groq, Tavily
- `client/` Next.js + shadcn chat UI

## Setup

You need Node 20+.

### 1. Server

```bash
cd server
npm install
cp .env.example .env     # then fill in the keys
npm run dev
```

| Variable | What it is | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq API key | yes |
| `TAVILY_API_KEY` | Tavily API key | yes |
| `PORT` | server port (default 8000) | no |
| `CLIENT_ORIGIN` | the client url (default http://localhost:3000) | no |
| `DATABASE_URL` | Neon Postgres connection string | for memory |
| `COHERE_API_KEY` | Cohere key (embeddings) | for memory |
| `PINECONE_API_KEY` | Pinecone key | for memory |
| `PINECONE_INDEX_NAME` | Pinecone index name. Create it as a plain dense vector index, 1024 dimensions, cosine (not a document-schema index) | for memory |

Without the memory variables the chat still works, it just has no memory.

Check it runs: `curl localhost:8000/health` should print `{"ok":true}`.

### 2. Client

```bash
cd client
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

