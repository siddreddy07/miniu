# plan.md — minimi chat agent (web search + memory)

Goal: a chat agent with ONE tool (web search) that answers fast, gets facts right, and remembers what the user asked and when.
Judged on architecture, so every choice must be explainable in `design.md`.

## Rules for the AI agent (read first, obey always)

1. Work ONE phase at a time. Finish it, run its "Done when" check, then STOP and wait for the next phase prompt.
2. Token discipline:
   - Do not re-read files you just wrote. Do not print whole files back.
   - Read only files the phase needs. Use `grep`/`head` over full reads.
   - Reply in max ~10 lines: what changed, how to test, anything the user must do.
   - No refactors outside the phase. No extra features. No comments that restate code.
3. Before using any API of `ai`, `@ai-sdk/react`, `@ai-sdk/groq`: check the installed version in `package.json` and read its types in `node_modules`. Code shapes below target AI SDK v5+. If the installed version differs, adapt to it, do not downgrade silently.
4. Backend is plain JavaScript (no TypeScript). Match the module system already in `server/package.json` (if none, use ESM with `"type": "module"`). Validate input with `zod`. Use JSDoc `@param`/`@returns` only on exported functions.
5. Secrets only in `server/.env` and `client/next-app/.env.local`. Commit `.env.example`, never real keys.
6. Prompt log: at the START of each phase, append an entry to `prompts.md` (format is in that file) using the real time from `date -Iseconds` and the user's message verbatim. Never invent or backdate entries.
7. If something is unclear, pick the simplest option, note it in `design.md` under decisions, and move on. Ask at most one question per phase.
8. Stub rule (important): database and embedding/vector calls are written but COMMENTED OUT, one call at a time, each marked `// DB-TODO:` or `// EMBED-TODO:`. Everything around them must be real, working code. With the calls commented out, the app must run end to end (chat, streaming, search, badges) and memory functions must return safe empty values (`[]`, `null`), never throw. Do not install DB/embedding/vector packages. The user will provide package names later.

## Stack (fixed)

| Part | Choice |
|---|---|
| Frontend | Next.js (App Router) + shadcn/ui in `client/next-app`. Chat UI uses the installed shadcn `message` and `message-scroller` (read their source first), plus `badge` |
| Backend | Node.js + Express, JavaScript, in `server` |
| LLM | Vercel AI SDK (`ai`, `@ai-sdk/groq`), Groq provider |
| Stream to UI | `useChat` from `@ai-sdk/react` on the client, `streamText` + UI message stream on the server |
| Search tool | Tavily API, exposed as the single `webSearch` tool |
| Database (later) | Neon Postgres: source of truth for messages with timestamps |
| Embeddings (later) | Cohere |
| Vector DB (later) | Pinecone: semantic index of past messages |
| Validation | `zod` |

Model: start with `llama-3.3-70b-versatile` on Groq. Check Groq's current model list. The model id lives in `config/ai.js` only.

## Server folder layout (fixed, inside `server/src/`)

```
server/src/
  server.js                      # starts app, reads PORT
  app.js                         # express app, cors, json, mounts routes, error handler
  config/
    env.js                       # loads + validates env (zod)
    ai.js                        # groq provider, model id, limits (max steps, history size, token caps), all AI settings
  routes/
    chat.routes.js               # POST /api/chat, GET /health
  controllers/
    chat.controller.js           # validates body, calls chat.service, handles abort/errors
  services/
    chat.service.js              # orchestrates one request (recall -> prompt -> streamText -> save)
    prompt.service.js            # builds system prompt (date/time, rules, recalled memory block)
    memory.service.js            # saveMessage, getRecentMessages (DB calls commented, safe fallbacks)
    recall.service.js            # decides if/what to recall, merges DB recency + vector matches
  tools/
    webSearch.tool.js            # the single tool (Tavily), trimmed results, cached
  lib/
    cache.js                     # tiny TTL cache
    embeddings.js                # embedText, embedMany (Cohere calls commented)
    vectorStore.js               # upsertMessageVector, querySimilar (Pinecone calls commented)
    db.js                        # DB client + query helpers (Neon calls commented)
```

Client:
```
client/next-app/
  app/page.tsx
  components/chat/chat.tsx           # useChat + layout
  components/chat/tool-call.tsx      # "Searching the web…" row
  components/chat/source-badges.tsx  # web result badges
  components/chat/memory-badges.tsx  # previous-chat badges
  lib/chat-id.ts                     # chat id in localStorage
```
(Client stays as the existing Next.js setup; use whatever language it already uses.)

## API contract

`POST /api/chat`
- Body: `{ id: string, messages: UIMessage[] }` (what `useChat` sends by default)
- Response: AI SDK UI message stream (SSE): text parts, tool parts (`tool-webSearch`), and one custom part `data-memory` with recalled snippets `{ chatId, role, text, createdAt }[]`. The `data-memory` part is only sent when snippets were actually injected.
- Errors: JSON `{ error }` with a proper status. Never leave a stream hanging.

## Memory design (what the stubs must look like)

Two stores, two jobs:
- Neon (Postgres): every message `{ id, chat_id, role, text, created_at }`. Answers "what did I ask, and when" and "last N messages".
- Pinecone: one vector per user message, metadata `{ chatId, role, createdAt, text }`. Answers "what did I ask about something like X".
- Cohere turns text into vectors. Use different input types for storing (`search_document`) and querying (`search_query`).

Flow per request (in `chat.service.js`):
1. Save user message (`// DB-TODO`)
2. Recall: decide with `recall.service.js` (recall-intent words like "earlier", "before", "last time", "yesterday", "did I ask", "what did I"). If yes: recent user messages from other chats (`// DB-TODO`) + semantic matches (`// EMBED-TODO` embed query, `// EMBED-TODO` Pinecone query, other chats only, score cut-off). Otherwise semantic matches only, top 2 above a score cut-off. Merge, dedupe, cap ~600 tokens, return `[]` if nothing good.
3. Build system prompt with date/time and a recalled block using absolute timestamps.
4. `streamText` with `webSearch`, `stopWhen: stepCountIs(3)`, last 12 messages only.
5. `onFinish`: save assistant message (`// DB-TODO`), then embed + upsert both messages WITHOUT blocking the response (`// EMBED-TODO`, fire and forget with a caught error).

Stub behaviour with everything commented: `recall` returns `[]`, saves are no-ops. Chat works from the messages the client sends.

## Phases

### Phase 0 — Setup check (tiny)
- `server`: it is already initialised. Do NOT add TypeScript. Create the folder layout above (empty files with the right exports are fine).
- Install only: `ai @ai-sdk/groq zod express cors dotenv`. Dev: `nodemon` (or `node --watch`).
- `config/env.js` validates `GROQ_API_KEY`, `TAVILY_API_KEY`, `PORT`, `CLIENT_ORIGIN`. Do not require DB/Cohere/Pinecone vars yet (list them in `.env.example` as commented lines).
- `GET /health` returns `{ ok: true }`.
- Client: confirm `ai` and `@ai-sdk/react` are installed; add `NEXT_PUBLIC_API_URL`.
- Done when: server runs and `curl localhost:PORT/health` works; client builds.

### Phase 1 — Streaming chat backend (no tools yet)
- `POST /api/chat`: route -> controller (zod validate) -> `chat.service`.
- `streamText` with the Groq model from `config/ai.js`, `convertToModelMessages(messages)`, system prompt from `prompt.service.js`.
- Pipe to Express with the SDK's Node helper (`pipeUIMessageStreamToResponse`).
- Stop the model call when the client disconnects.
- System prompt v1: short; current date/time + timezone; tone rules.
- Done when: `curl -N` shows a streamed reply.

### Phase 2 — Chat UI
- Read the installed `message` and `message-scroller` source first; use them as they are.
- `chat.tsx`: `useChat` with transport to `NEXT_PUBLIC_API_URL/api/chat`, stable `id` from `chat-id.ts`.
- Show user/assistant messages, auto-scroll, input (Enter to send), Stop button while streaming, error line with Retry. Text parts only for now.
- Done when: a message streams token by token.

### Phase 3 — Web search tool + visible tool calls
- `tools/webSearch.tool.js`: `tool({ description, inputSchema: z.object({ query: z.string().min(2).max(200) }), execute })`.
- `execute` calls Tavily (`search_depth: "basic"`, `max_results: 5`), returns only `{ query, results: [{ title, url, snippet }] }`, snippets trimmed to ~300 chars, 6s timeout, errors returned as `{ error }` (never thrown). Cached 10 min by normalized query via `lib/cache.js`.
- `streamText`: `tools: { webSearch }`, `stopWhen: stepCountIs(3)`.
- System prompt v2: search only when the answer may be recent, specific or uncertain; no search for greetings or stable knowledge; cite as `[1]`, `[2]` matching result order; if results do not answer it, say so; never invent URLs.
- UI: `tool-call.tsx` shows tool part states ("Searching: <query>" while running, "Searched: <query>" when done, "Search failed" on error). `source-badges.tsx` shows one small `Badge` link per result (domain, new tab, numbered to match `[n]`).
- Done when: "what's the latest on X?" shows the searching row, badges and a cited answer; "hi" triggers no search.

### Phase 4 — Memory pipeline (DB and vector calls commented out)
- Build `memory.service.js`, `recall.service.js`, `lib/db.js`, `lib/embeddings.js`, `lib/vectorStore.js` exactly as in "Memory design". Real logic everywhere (intent detection, merging, dedupe, token cap, timestamp formatting, prompt block, `data-memory` part via `createUIMessageStream` writer and `writer.merge(result.toUIMessageStream())`).
- Every actual DB, Cohere and Pinecone call is commented out with `// DB-TODO:` / `// EMBED-TODO:` plus a one-line note on what it will do. Function signatures, inputs and outputs are final.
- Add a tiny local test script `server/scripts/test-recall.js` that feeds fake recalled snippets into `prompt.service.js` and prints the prompt block, so the formatting is verified without a DB.
- UI: `memory-badges.tsx` renders `data-memory` parts as badges ("From earlier chat · Nov 12, 2:03 PM", hover shows the snippet). It must render correctly when the part is absent.
- When this phase ends, STOP and tell the user exactly what is needed for Phase 5 (see below). Do not implement it.
- Done when: the app works exactly as in Phase 3, and the test script prints a correct memory block.

### Phase 5 — Turn on Neon, Cohere, Pinecone (ONLY when the user says so)
Before starting, the agent asks the user for: package names to install, `DATABASE_URL` (Neon), `COHERE_API_KEY`, `PINECONE_API_KEY`, Pinecone index name. Cohere model and Pinecone index dimension must match (check Cohere docs for the model's output size and tell the user the exact number to create the index with).
- Uncomment the marked calls, create the `messages` table (simple SQL or migration script), wire embeddings (`search_document` on save, `search_query` on recall), Pinecone upsert/query with `chatId != current` filter.
- Add the env vars to `config/env.js` as required.
- Done when: ask something in chat A, open chat B, ask "what did I ask you earlier?", get the right answer with a badge.

### Phase 6 — Speed and correctness pass
- One log line per request: time to first token, total time, whether search/recall ran.
- Run recall and the cache lookup before the model call, in parallel with each other. Embedding and upserts after the response, never blocking.
- Friendly UI messages for Groq 429/5xx; if Tavily fails the model says search failed; if Neon/Cohere/Pinecone fail, skip recall silently and still answer.
- `server/evals/questions.json` (10 questions: 3 need search, 3 do not, 2 recall, 2 tricky) and `npm run eval` printing search-used yes/no and latency per question.
- Done when: eval runs clean and no-search questions reach first token in roughly 1.5s or less.

### Phase 7 — Docs and submission
- Finalize `design.md` to match what was really built (mark anything not done as future).
- `README.md`: short setup, env vars, how to run both apps.
- `.env.example` in both apps, `.gitignore` check (no secrets).
- Done when: a fresh clone runs with the listed keys.

## Out of scope (do not build)
Auth, chat list sidebar, file upload, other tools, deployment configs. Mention as "future" in `design.md` only.