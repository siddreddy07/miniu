"use client"

import { useEffect, useState } from "react"
import type { UIMessage } from "ai"

import { useRouter } from "next/navigation"

import { getUserId, newChatId } from "@/lib/chat-id"
import Chat from "@/components/chat/chat"
import AppSidebar, { type ChatItem } from "@/components/chat/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

// Asks the server for the chat list of this user
async function fetchChats(userId: string): Promise<ChatItem[]> {
  try {
    const response = await fetch(apiUrl + "/api/chats?userId=" + userId)
    const data = await response.json()
    return data.chats
  } catch {
    return []
  }
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
    return data.messages.map(
      (message: { id: string; role: "user" | "assistant"; text: string }) => ({
        id: message.id,
        role: message.role,
        parts: [{ type: "text", text: message.text }],
      })
    )
  } catch {
    return []
  }
}

// The chat id comes from the URL: /chat/<chatId>
export default function ChatApp({ chatId }: { chatId: string }) {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [chats, setChats] = useState<ChatItem[]>([])
  // null means "still loading the messages"
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  )

  // When the page opens: take the user id from localStorage, then load the chat list
  // and the messages of the chat in the URL.
  // If the chat is not this user's, the server says "not found" and we show an empty chat.
  useEffect(() => {
    async function start() {
      const savedUserId = getUserId()
      const [chatList, messages] = await Promise.all([
        fetchChats(savedUserId),
        fetchMessages(savedUserId, chatId),
      ])
      setUserId(savedUserId)
      setChats(chatList)
      setInitialMessages(messages)
    }
    start()
  }, [chatId])

  async function reloadChats() {
    setChats(await fetchChats(userId))
  }

  // Changing the chat means changing the URL
  function selectChat(id: string) {
    router.push("/chat/" + id)
  }

  function startNewChat() {
    router.push("/chat/" + newChatId())
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          chats={chats}
          currentChatId={chatId}
          onSelectChat={selectChat}
          onNewChat={startNewChat}
        />
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <span className="text-sm font-medium">Chat</span>
          </header>

          {initialMessages !== null && (
            <Chat
              key={chatId}
              userId={userId}
              chatId={chatId}
              initialMessages={initialMessages}
              onSaved={reloadChats}
            />
          )}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
