# DESIGN.md

A chat agent with one tool, web search. It answers fast, cites its sources, and remembers what you asked and when, so it can answer "what did I ask on 3 November, is it still correct?".

## How it works

```
Browser (Next.js) --POST /api/chat--> Express --> chat.service.startChat
  1. save the user message                         (Neon)
  2. recall earlier chats                          (Neon by day, Pinecone by meaning)
  3. build the system prompt (date, memory block)
  4. streamText (Groq) with the webSearch tool     (Tavily)
  5. stream: start -> memory badges -> text + tool parts
  6. after the reply: save the answer and its sources (Neon), embed the question (Cohere -> Pinecone)
```

One request, one stream. Text, tool calls and memory evidence all travel on it. Saving and indexing happen after the reply, so the user never waits for them.

## Decisions

- **Memory is a step before the model, not a tool.** The brief allows one tool. A pre-step costs no extra model round trip. Cheap word rules decide whether a message is about the past (`wantsRecall`).
- **Neon for exact facts, Pinecone for meaning.** "What did I ask yesterday / Monday / 3 November" is a date question: plain JavaScript reads the day in the user's timezone (`getDateRange`) and Neon returns that user's messages. "Did we talk about X" is a meaning question: Cohere embeddings and Pinecone.
- **One Pinecone namespace per user.** One user can never match another's messages, and no filter is needed. Only user messages are embedded.
- **Old answers come back through the question.** For a past question, each recalled message gets the assistant reply that followed it (`getAnswerAfter`, Neon), so "what was the second place you suggested?" works.
- **"Has it changed since?" turns search back on.** A past-only question has search off and may not claim anything changed. If it also asks about updates (`wantsFresh`), the model searches once and compares the old answer with what the web shows now, in two or three sentences.
- **A day word alone is not memory.** "Who won the match yesterday?" must search the web, so a day counts only with words like "I asked" or "we shortlisted".
- **Fast.** Groq streaming, a short strict prompt, 5 trimmed search results, a 10 minute search cache, at most 2 searches per answer, only the last 12 messages sent.
- **Right.** Search for anything recent. Cite as `[1]` and show source badges. If the search fails or says nothing, the model says so.
- **Built for a small model.** Tools are switched off on the last step so it must answer. The search result is saved with the answer, so badges survive a reload.
- **Never a single point of failure.** If Neon, Cohere or Pinecone fail, recall is skipped and chat still works.
- **Express, not Next route handlers**, so the agent can serve other clients. **Plain JavaScript** in a simple style, with zod at the edge. Users are anonymous ids in the browser, and chats are checked for ownership (403).

## Considered and rejected

- Memory as a second tool: breaks the one-tool rule and adds a model round trip.
- Pinecone for dates: its `createdAt` is text and cannot be range-filtered, and Neon has the real timestamps.
- One namespace per chat: a query reads one namespace, and recall must cross all chats.
- Embedding assistant answers too: it dilutes matches. Loading the answer from Neon is cheaper and exact.
- SQLite: does not survive serverless hosting.

## Known limits

- Recall depends on word lists (`wantsRecall`, `wantsFresh`), so an unusual way of asking may not trigger memory.
- A follow-up with no recall phrase does not bring back older chats.

## With another week

**Make what exists stronger**

- Proper authentication (OAuth or email login) instead of anonymous browser ids, with sessions and rate limits per user.
- Cancel the model call when the user presses Stop.
- A small classifier instead of word lists for "is this about the past?", so recall triggers on any phrasing.
- Numeric `createdAt` in Pinecone so vector search can filter by date, and loading the old answer for follow-ups that use no recall phrase.
- Semantic caching: embed each question and reuse a recent answer when a new one means the same thing, for less latency and cost.
- More guardrails: prompt-injection checks on search results, input and output moderation, PII redaction before anything is embedded, and a check that every claim has a citation.
- Fetch page content for top search hits and re-rank, since snippets can be old.
- Evals with graded answers (latency, tool use, recall accuracy, "did it check before saying nothing changed"), run in CI.
- Tracing and metrics per request (first-token time, search time, recall hit rate).

**New features**

- File upload with a proper ingestion pipeline: store the file, put a job on a queue, and let a worker parse, chunk, embed and index it into the user's Pinecone namespace, with status shown in the UI. The agent can then answer from the user's own documents as well as the web.
- Summarise old chats instead of dropping them, and pagination of chat history.
- Search and delete over past chats, and export them.

Not measured: the 1.5 second first-token time. The UI was verified by build, lint and scripted requests, not an automated browser test.
