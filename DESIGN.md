# DESIGN.md

## What I built

MINIU is a chat agent with one tool: web search. It answers fast, shows where each fact came from, and remembers what you asked and when. So you can ask "what did I ask on 3 November, and is it still correct?".

It handles three kinds of questions:

| You ask | What it does |
| --- | --- |
| "When is the GTA VI release date?" | Normal question. Search is on, the answer cites sources as `[1]`, `[2]`. |
| "Did we talk about GTA VI?" | About your past. Search is off, it answers from your old chats and gives the date. |
| "Did we talk about GTA VI? Any updates since?" | Past and present. It reads the old answer, searches once, and says what changed. |

## How it works

1. The server saves your message in the database (Neon).
2. It checks whether you are asking about your own past chats (`wantsRecall`, `wantsFresh`). If yes, it finds those old messages:
   - A day ("yesterday", "Monday", "3 November"): plain code turns it into a start and end time in your timezone (`getDateRange`), and Neon returns your messages in that range.
   - A topic ("did we talk about Kyoto food?"): Cohere turns the question into a vector, and Pinecone finds your old questions with the same meaning.
   - For each old question found, it also loads the answer that came right after it from Neon (`getAnswerAfter`).
3. It writes the instructions for the model: today's date, the rules, and the old messages.
4. The model (Groq) writes the answer through the Vercel AI SDK (`ai` with `@ai-sdk/groq`): `streamText` runs the model, and `tool()` defines web search (Tavily). If it needs fresh facts, it calls the tool.
5. Everything streams to the browser on one connection. On the server, `createUIMessageStream` first writes the "From earlier chat" badges, then merges in the model stream (text, the search step, sources), and `pipeUIMessageStreamToResponse` sends it through Express. In the browser, `useChat` from `@ai-sdk/react` with `DefaultChatTransport` reads the stream and renders each part as it arrives.
6. After the answer, the server saves it with its sources, and stores your question in Pinecone. You never wait for this.

## Why we built it this way

- **Memory is a step before the model, not a tool.** The brief allows one tool, and a step before the model costs no extra model call.
- **Word checks decide the kind of question.** This decides which tools the model gets, so it must run before the model, cost nothing and always give the same result.
- **Neon for dates, Pinecone for meaning.** Neon has exact times, so "what did I ask on Monday" is an exact lookup. Pinecone finds the same topic in different words.
- **Only questions go into Pinecone, answers come from Neon.** Embedding answers too makes matches worse. Reading the answer after the question is cheap and exact, and it makes "what was the second place you suggested?" work.
- **One Pinecone namespace per user.** A search can only read your own messages. There is no filter that someone could forget.
- **Search is off for past-only questions.** The answer must come from memory. The model is also told not to claim anything changed, because it did not check.
- **"Any updates since?" turns search back on.** Only the web knows what is true now, so it searches once and compares.
- **A day word alone is not memory.** "Who won the match yesterday?" must search the web. A day counts only with words like "I asked" or "we shortlisted".
- **Fast:** Groq streaming, short instructions, 5 trimmed search results, a 10 minute search cache, at most 2 searches per answer, only the last 12 messages sent.
- **Correct:** it cites every fact. If search fails or finds nothing, it says so instead of guessing.
- **Built for a small model:** on the last step the tool is turned off, so it must answer instead of searching again.
- **Never one point of failure:** if Neon, Cohere or Pinecone is down, memory is skipped and chat still works.
- **Vercel AI SDK on both sides.** The server and the browser speak the same message format, so streaming, tool calls and our own memory parts need no custom protocol. Changing the model provider means changing one line (`@ai-sdk/groq`).
- **Express, not Next.js API routes,** so other clients can use the same agent. **Plain JavaScript**, with input checked by zod.

## Trade-offs

| We chose | Instead of | We gain | We give up |
| --- | --- | --- | --- |
| Word checks | A model deciding if it is about the past | Free, instant, predictable | Unusual wording can be missed |
| Vercel AI SDK | Calling the Groq API and writing our own stream | Streaming, tools and the React hook work out of the box | We follow the SDK's message format and its version changes |
| Memory as a step | Memory as a second tool | One tool, no extra model call | The model cannot ask for more memory itself |
| Neon for dates | Pinecone date filter | Exact time ranges | Two stores to keep in sync |
| Only questions in Pinecone | Questions and answers | Better matches, exact old answers | One extra database read per match |
| One namespace per user | One per chat | Memory works across all chats, private by design | A chat cannot be searched on its own |
| Saving after the reply | Saving before | The user never waits | A just-asked question is searchable only a few seconds later |
| Neon | SQLite | Works on serverless hosting | Needs a network connection |
| Anonymous ids | Real login | Nothing to set up | Anyone with the id can see the chats |

## How it was built

Built with the help of AI coding agents: OpenCode and Claude Code.

## Limitations

- Memory depends on word lists, so an unusual way of asking may not trigger it.
- A follow-up with no memory phrase does not bring back older chats.
- Pressing Stop hides the answer but does not cancel the model call.
- Old answers are cut to 500 characters when loaded.
- The 1.5 second first-token time was not measured. The UI was checked by build, lint and scripted requests, not an automated browser test.

## With more time

**Hardening**

- Proper login instead of anonymous ids.
- A rate limiter on `/api/chat`.
- More guardrails on input, output and search results.
- Cancel the model call when the user presses Stop.

**Better memory and speed**

- Date filtering in Pinecone, and memory for follow-ups with no memory phrase.
- Semantic caching for repeated questions.

**New features**

- File upload with a queue and an ingestion pipeline, so it can answer from your own documents.
