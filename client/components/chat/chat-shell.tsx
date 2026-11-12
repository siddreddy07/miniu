"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { getUserId, newChatId } from "@/lib/chat-id"
import AppSidebar, { type ChatItem } from "@/components/chat/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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

// The chat page needs the user id, and needs to reload the sidebar list after a reply
type ShellData = {
  userId: string
  reloadChats: () => void
}

const ShellContext = createContext<ShellData>({
  userId: "",
  reloadChats: () => {},
})

export function useShell() {
  return useContext(ShellContext)
}

// This stays on the screen while we move between chats.
// Only the chat area (children) changes, so the sidebar does not reload.
export default function ChatShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ chatId?: string }>()
  const currentChatId = params.chatId ?? ""

  const [userId, setUserId] = useState("")
  const [chats, setChats] = useState<ChatItem[]>([])
  const [chatsLoaded, setChatsLoaded] = useState(false)

  // Once, when the app opens: find the user and load the chat list
  useEffect(() => {
    async function start() {
      const savedUserId = getUserId()
      const chatList = await fetchChats(savedUserId)
      setUserId(savedUserId)
      setChats(chatList)
      setChatsLoaded(true)
    }
    start()
  }, [])

  async function reloadChats() {
    setChats(await fetchChats(userId))
  }

  return (
    <ShellContext.Provider value={{ userId, reloadChats }}>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            chats={chats}
            chatsLoaded={chatsLoaded}
            currentChatId={currentChatId}
            onSelectChat={(id) => router.push("/chat/" + id)}
            onNewChat={() => router.push("/chat/" + newChatId())}
          />
          <SidebarInset>
            <header className="flex h-12 items-center gap-2 border-b px-3">
              <SidebarTrigger />
              <span className="text-sm font-medium">Chat</span>
            </header>

            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </ShellContext.Provider>
  )
}
