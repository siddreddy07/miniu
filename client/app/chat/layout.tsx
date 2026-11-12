import ChatShell from "@/components/chat/chat-shell"

// Every page under /chat shares this layout, so the sidebar stays when the chat changes
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ChatShell>{children}</ChatShell>
}
