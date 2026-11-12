"use client"

import { useEffect, useState } from "react"
import type { UIMessage } from "ai"

import Chat from "@/components/chat/chat"
import { useShell } from "@/components/chat/chat-shell"

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// What the server sends for each saved message
type SavedMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  // the web search the assistant did for this answer (or null)
  search: { query: string; results: unknown[] } | null
}

// Turns a saved message into a message the chat screen understands
function toUIMessage(message: SavedMessage) {
  const parts = []

  // If the answer used a web search, bring back the search row and the source badges
  if (message.search) {
    parts.push({
      type: "tool-webSearch",
      toolCallId: "saved-" + message.id,
      state: "output-available",
      input: { query: message.search.query },
      output: message.search,
    })
  }
  parts.push({ type: "text", text: message.text })

  return { id: message.id, role: message.role, parts: parts } as UIMessage
}

// Asks the server for the saved messages of one conversation.
// The conversation id goes in the URL, the user id goes in the body.
async function fetchMessages(
  userId: string,
  chatId: string
): Promise<UIMessage[]> {
  try {
    const response = await fetch(
      apiUrl + "/api/chats/" + chatId + "/messages",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId }),
      }
    )
    // 404 means a new conversation that has no messages yet
    if (!response.ok) return []
    const data = await response.json()
    return data.messages.map(toUIMessage)
  } catch {
    return []
  }
}

// The chat area for the chat in the URL: /chat/<chatId>.
// The sidebar is not here, it stays on the screen in the layout.
export default function ChatApp({ chatId }: { chatId: string }) {
  const { userId, reloadChats } = useShell()

  // null means "still loading the messages"
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  )

  // Load the messages of this chat once we know the user.
  // If the chat is not this user's, the server says "not found" and we show an empty chat.
  useEffect(() => {
    if (userId === "") return
    async function load() {
      setInitialMessages(await fetchMessages(userId, chatId))
    }
    load()
  }, [userId, chatId])

  if (initialMessages === null) {
    return <p className="p-4 text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <Chat
      userId={userId}
      chatId={chatId}
      initialMessages={initialMessages}
      onSaved={reloadChats}
    />
  )
}
