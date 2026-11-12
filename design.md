# design.md

A chat agent with one tool (web search) that answers fast, cites its sources, and remembers what you asked and when.

> Draft written before implementation. It gets updated at the end so it matches the real code.

## 1. What the brief asks for, and how I read it

| Brief | My reading |
|---|---|
| Answer fast | Stream from the first token. Skip search when it is not needed. Keep context small. Never block the reply on saving or indexing. |
| Get things right | Search for anything recent or uncertain. Cite every claim from search. Say "I couldn't find it" instead of guessing. |
| Remember what you asked and when | Store every message with a timestamp. Recall relevant past messages and show them as evidence badges. |
| One tool, web search | Memory is not a tool. The server recalls before the model runs. |

## 2. Architecture

```
Browser (Next.js + shadcn)
  useChat ──POST /api/chat──▶ Express (JavaScript)
     ▲                          route → controller → chat.service
     │                          1. save user message         (Neon)
     │                          2. recall past messages       (Neon recency + Pinecone similarity)
     │                          3. build prompt (date, memory block)
     │                          4. streamText (Groq) + webSearch tool (Tavily)
     └──── UI message stream ◀──5. stream text, tool parts, data-memory part
                                6. after reply: save assistant message, embed (Cohere), upsert (Pinecone)
```

One request, one stream. Text, tool calls and memory evidence all travel on the same stream, so the UI needs no second channel.

Server layout: `config` (env, AI settings), `routes`, `controllers` (HTTP only), `services` (the logic), `tools` (the one tool), `lib` (cache, db, embeddings, vector store). Controllers never contain business logic, services never touch `req`/`res`.

## 3. Decisions and tradeoffs

**Vercel AI SDK on both ends.**
Streaming and tool-call states are built in, so no hand-rolled SSE parsing. Tradeoff: tied to the SDK's message format. Worth the time saved.

**Groq as provider.**
Very low time to first token, which is the "fast" requirement. Tradeoff: open models follow long instructions less well, so the system prompt is short and strict. The model id lives in `config/ai.js`, a one-line swap.

**Express instead of Next.js route handlers.**
Keeps the agent separate from the UI so it can be reused by other clients (for example a Mac app). Tradeoff: two processes and CORS.

**Plain JavaScript on the server.**
Fastest path for a small service, with zod validating every input at the edge. Tradeoff: no compile-time types, so JSDoc on exported functions and validation at boundaries.

**Memory is a pre-step, not a tool.**
The brief allows one tool. A pre-step also costs no extra model round trip. Tradeoff: the model cannot choose to recall, so cheap rules (recall-intent words) plus similarity decide.

**Neon Postgres for messages, Pinecone for meaning.**
Neon answers "what did I ask, and when" with exact order and timestamps. Pinecone answers "what did I ask about something like this" by meaning. Each does what it is good at. Tradeoff: two services to run and keep in sync, and Pinecone is only a derived index (Neon is the source of truth, so the index can be rebuilt).
Why not SQLite: a local file does not survive serverless or ephemeral hosting and cannot be shared by multiple server instances. Neon is a hosted URL that works anywhere.

**Cohere embeddings with separate document and query modes.**
Cohere's models are trained for retrieval, using `search_document` when storing and `search_query` when searching. Tradeoff: one extra network call per search.

**Embedding and indexing happen after the reply.**
Users never wait for them. Tradeoff: a message is searchable a moment later, which is fine because the current chat is already in context.

**Recall only from other chats, only when relevant.**
The current chat is already in context, so recalling it wastes tokens. Weak matches add noise, so there is a score cut-off and a token cap. Tradeoff: some borderline matches are skipped.

**Graceful degradation.**
If Neon, Cohere or Pinecone fail, recall is skipped and the agent still answers. Memory is an enhancement, never a single point of failure.

**Absolute timestamps in recalled snippets and in the system prompt.**
"When" questions need real dates and the model should not guess today's date.

**Search results are trimmed and cached.**
Five results with ~300-char snippets are enough to answer and keep tokens low. A 10 minute cache makes repeats instant. Tradeoff: up to 10 minutes stale.

**Max 3 steps per answer.**
Stops search loops and keeps latency predictable. Tradeoff: very deep research gets a shorter answer.

**Evidence as badges.**
Web badges are numbered to match `[1]` in the text. Memory badges show the date of the earlier chat. Users see what came from the web versus their own history, one click to verify.

**Store text only.**
Tool payloads are big and rarely useful later. Tradeoff: cannot replay old search results, only what was said.

## 4. Failure handling

| Failure | Behaviour |
|---|---|
| Tavily timeout or error | Tool returns an error object, the model says it could not search |
| Groq rate limit or 5xx | UI shows a short message with Retry |
| User stops generation | Server aborts the model call, no wasted tokens |
| Neon, Cohere or Pinecone down | Recall skipped, answer continues |
| No good memory match | Nothing injected, no badge |

## 5. What I would do next

- Auth and per-user memory (today memory is per browser)
- Summarize old chats instead of dropping them
- Re-rank search results and fetch page content for top hits
- Evals with graded answers, not only latency and tool-use checks

## 6. How I built it

Built with an AI coding agent, phase by phase from `plan.md`. The real prompt log is in `prompts.md`.