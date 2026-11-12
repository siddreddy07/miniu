"use client"

import { useEffect, useState } from "react"
import type { UIMessage } from "ai"

import { getUserId, getChatId, setChatId, newChatId } from "@/lib/chat-id"
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

// Asks the server for the saved messages of one chat
async function fetchMessages(
  userId: string,
  chatId: string
): Promise<UIMessage[]> {
  try {
    const response = await fetch(
      apiUrl + "/api/chats/" + chatId + "/messages?userId=" + userId
    )
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

export default function ChatApp() {
  const [userId, setUserId] = useState("")
  const [chatId, setCurrentChatId] = useState("")
  const [chats, setChats] = useState<ChatItem[]>([])
  // null means "still loading the messages"
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  )

  // When the page opens: find the user, the open chat, and load them
  useEffect(() => {
    async function start() {
      const savedUserId = getUserId()
      const savedChatId = getChatId()
      const [chatList, messages] = await Promise.all([
        fetchChats(savedUserId),
        fetchMessages(savedUserId, savedChatId),
      ])
      setUserId(savedUserId)
      setCurrentChatId(savedChatId)
      setChats(chatList)
      setInitialMessages(messages)
    }
    start()
  }, [])

  async function reloadChats() {
    setChats(await fetchChats(userId))
  }

  async function selectChat(id: string) {
    if (id === chatId) return
    setInitialMessages(null)
    setChatId(id)
    setCurrentChatId(id)
    setInitialMessages(await fetchMessages(userId, id))
  }

  function startNewChat() {
    setCurrentChatId(newChatId())
    setInitialMessages([])
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
