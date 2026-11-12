# design.md

A chat agent with one tool (web search) that answers fast, cites its sources, and remembers what you asked and when.

> Updated at the end of the build to match the real code. Anything not built is listed under "What I would do next".

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
     │                          2. recall past messages       (Neon by day or recency + Pinecone similarity)
     │                          3. build prompt (date, memory block)
     │                          4. streamText (Groq) + webSearch tool (Tavily)
     └──── UI message stream ◀──5. stream text, tool parts, data-memory part
                                6. after reply: save assistant message (Neon); embed the user message (Cohere) and upsert it (Pinecone)
```

One request, one stream. Text, tool calls and memory evidence all travel on the same stream, so the UI needs no second channel.

Server layout: `config` (env, AI settings), `routes`, `controllers` (HTTP only), `services` (the logic), `tools` (the one tool), `lib` (cache, db, embeddings, vector store). Controllers never contain business logic, services never touch `req`/`res`.

## 3. Decisions and tradeoffs

**Vercel AI SDK on both ends.**
Streaming and tool-call states are built in, so no hand-rolled SSE parsing. Tradeoff: tied to the SDK's message format. Worth the time saved.

**Groq as provider.**
Very low time to first token, which is the "fast" requirement. Tradeoff: open models follow long instructions less well, so the system prompt is short and strict. The model id lives in `config/ai.js`, a one-line swap. `llama-3.3-70b-versatile` no longer exists on Groq, so the app uses `openai/gpt-oss-120b`. In testing, `gpt-oss-20b` and `qwen3.8-27b` sometimes called a tool after tools were switched off, which Groq rejects with a 400, while the 120b followed the rules. Its thinking is requested separately and not shown.

**Express instead of Next.js route handlers.**
Keeps the agent separate from the UI so it can be reused by other clients (for example a Mac app). Tradeoff: two processes and CORS.

**Plain JavaScript on the server.**
Fastest path for a small service, with zod validating the request body at the edge. The code is deliberately written in a simple, beginner-friendly style (plain functions, plain `if`, few abstractions). Tradeoff: no compile-time types, so validation happens at the boundary. Env values are read straight from `process.env` after `dotenv` loads `.env`, with no config layer on top.

**Memory is a pre-step, not a tool.**
The brief allows one tool. A pre-step also costs no extra model round trip. Tradeoff: the model cannot choose to recall, so cheap rules (recall-intent words) plus similarity decide.

**Neon Postgres for messages, Pinecone for meaning.**
Neon answers "what did I ask, and when" with exact order and timestamps. Pinecone answers "what did I ask about something like this" by meaning. Each does what it is good at. Tradeoff: two services to run and keep in sync, and Pinecone is only a derived index (Neon is the source of truth, so the index can be rebuilt).
Why not SQLite: a local file does not survive serverless or ephemeral hosting and cannot be shared by multiple server instances. Neon is a hosted URL that works anywhere.

**Cohere embeddings with separate document and query modes.**
Cohere's models are trained for retrieval, using `search_document` when storing and `search_query` when searching. Tradeoff: one extra network call per search.

**Tables in Neon.**
Three tables: `users` (id), `chats` (id, user_id, title, created_at) and `messages` (id, chat_id, role, text, created_at). One user has many chats, and one chat has many messages. A message belongs only to its chat, so to find a user's messages we go through the chat. The user id is an anonymous id the browser makes and keeps in localStorage (a real login is future work). `POST /api/chats/:chatId/messages` takes the chat id from the URL and the user id from the body, finds the chat for that user (404 if it is not theirs) and returns the chat with all its messages. There is no pagination yet.

**What Pinecone stores.**
One record per user message, stored in the user's own **namespace** (the namespace is the userId), so one user's vectors are completely separate from another's and the search needs no user filter. Id: `<userId>:<chat created time>:<message time>`, where the chat time is when that chat was first created. Values: the 1024-number Cohere vector. Metadata: `chatId`, `chatCreatedAt`, `role`, `createdAt`, `text`. A search covers every chat of that user, old ones and the current one. The chat time and chat id stay in the metadata so more filters can be added later. Pinecone is not used for day questions (see "Date-based recall"), because its `createdAt` metadata is text and cannot be range-filtered. Messages the model already sees in the current chat are skipped when recalling. We do not use one namespace per chat, because a Pinecone query reads only one namespace and recall must reach all of a user's chats.

**Date-based recall reads Neon, not Pinecone.**
For "what did I ask yesterday / on Monday / last week Tue / November 10th" the server reads the day from the message in plain JavaScript (`lib/dateRange.js`, `getDateRange`), in the timezone the browser sends with each message. It then asks Neon for that user's messages between the start and end of that day (`selectUserMessagesInRange`, joined through `chats` on `user_id`). Neon is the source of truth and has real timestamps, so no vector search is needed. If no day is found, or that day has no messages, recall falls back to recent chats plus Pinecone similarity. A day word alone is not enough: "who won the match yesterday?" must still use web search, so a day only counts as a question about the past when words like "I ask", "I said" or "we talk" are also there (`wantsRecall`). Tradeoff: the wording lists are small and fixed, so unusual phrasing falls back to normal search.

**Only user messages are embedded.**
"What did I ask" is about the user's own words. Embedding assistant text would dilute the matches. The assistant message is still saved in Neon. When the user asks about the past ("did we talk about...", "what was the second place you suggested"), each recalled question gets the assistant reply that followed it, read from Neon (`getAnswerAfter`), so the model can repeat what it said before. This costs one extra query, so it runs only for past questions.

**Embedding and indexing happen after the reply.**
Users never wait for them. Tradeoff: a message is searchable a moment later, which is fine because the current chat is already in context.

**Recall only from other chats, only when relevant.**
The current chat is already in context, so recalling it wastes tokens. Weak matches add noise, so there is a score cut-off and a token cap. Tradeoff: some borderline matches are skipped.

**Graceful degradation.**
If Neon, Cohere or Pinecone fail, recall is skipped and the agent still answers. Memory is an enhancement, never a single point of failure.

**Absolute timestamps in recalled snippets and in the system prompt.**
"When" questions need real dates and the model should not guess today's date.

**Search results are trimmed and cached.**
Five results with ~300-char snippets are enough to answer and keep tokens low. A 10 minute in-memory cache (checked inside the search service) makes repeats instant. Tradeoff: up to 10 minutes stale, and the cache is lost on restart. The model picks the search query, so the cache cannot be checked before the model runs; this differs from the first draft.

**Built for a small model.**
Tool description and input are short and strict (query 2 to 200 chars), tool output is capped, the last step has tools turned off so the model must write an answer instead of looping, and a search error returns `{ error }` so the model can say the search failed.

**Stream order matters.**
The server sends the `start` chunk first, then the `data-memory` part, then the model stream. In testing, the browser dropped a memory part that arrived before `start`.

**Max 2 tool calls per answer.**
Stops search loops and keeps latency predictable. Tradeoff: very deep research gets a shorter answer.

**Evidence as badges.**
Web badges are numbered to match `[1]` in the text. Memory badges show the date of the earlier chat. Users see what came from the web versus their own history, one click to verify.

**Store the trimmed search result with the answer.**
The assistant message keeps the web search it used (`search`: query plus the 5 trimmed results, saved as JSON in `messages.search`), so source badges still show after a reload. Tradeoff: a little more storage per answer. Full page content is never stored.

## 4. Failure handling

| Failure | Behaviour |
|---|---|
| Tavily timeout or error | Tool returns an error object, the model says it could not search |
| Groq rate limit (429) or 5xx | UI shows a short friendly message with Retry |
| User stops generation | The UI stops reading the stream. The server does not cancel the model call yet (future), so some tokens are wasted |
| Neon, Cohere or Pinecone down | Recall skipped, answer continues |
| No good memory match | Nothing injected, no badge |

## 5. What I would do next

- Cancel the model call on the server when the user presses Stop or closes the page (it was removed to keep the code simple)
- Real login (today a user is a random id kept in the browser, so clearing it loses the chats)
- File upload (out of scope for this build)
- Numeric `createdAt` in Pinecone metadata, so date filters can also run inside Pinecone
- Summarize old chats instead of dropping them
- Re-rank search results and fetch page content for top hits
- Evals with graded answers, not only latency and tool-use checks

## 6. How I built it

Built with an AI coding agent, phase by phase from `plan.md`. The prompt log is kept locally and is not pushed to the repo.

Changes made while building, each logged as a prompt: simpler beginner-level code everywhere, no `env.js`, no global error handler, no abort handling, and the search code split into a service, a tool and a single `tools/tool.js`.

AI SDK v7 differences handled: `stepCountIs` is now `isStepCount`, and the standalone `toUIMessageStream` and `pipeUIMessageStreamToResponse` are used instead of the deprecated methods on the result.

Verification status: tested live with real keys. Hi (no search), search with citations (Bitcoin price, F1 winner), and recall in a new chat all worked, including Pinecone matching a Kyoto trip question to an earlier chat that had no shared keywords. The 1.5 second first-token target was not measured. Note: the Pinecone index must be a plain 1024 dimension cosine vector index. An index created with a document schema rejects normal vector writes.
