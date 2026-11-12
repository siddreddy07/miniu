"use client"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export type ChatItem = {
  id: string
  title: string
  createdAt: string
}

type AppSidebarProps = {
  chats: ChatItem[]
  chatsLoaded: boolean
  currentChatId: string
  onSelectChat: (id: string) => void
  onNewChat: () => void
}

// Makes a small date like "Nov 12, 2:03 PM"
function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function AppSidebar({
  chats,
  chatsLoaded,
  currentChatId,
  onSelectChat,
  onNewChat,
}: AppSidebarProps) {
  // On a small screen the sidebar is a drawer, so we close it after a click
  const { setOpenMobile } = useSidebar()

  // A chat that has no messages yet is not in the list, so we show it as "New chat"
  const isNewChat =
    chatsLoaded && !chats.some((chat) => chat.id === currentChatId)

  function handleSelect(id: string) {
    onSelectChat(id)
    setOpenMobile(false)
  }

  function handleNewChat() {
    onNewChat()
    setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Button
          className="cursor-pointer border-2 border-dashed"
          onClick={handleNewChat}
        >
          New chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isNewChat && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive className="h-auto">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">New chat</span>
                      <span className="text-xs text-muted-foreground">
                        Just now
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    isActive={chat.id === currentChatId}
                    onClick={() => handleSelect(chat.id)}
                    className="mt-1 h-auto cursor-pointer hover:opacity-90"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{chat.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(chat.createdAt)}
                      </span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
