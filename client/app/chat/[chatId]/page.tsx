import ChatApp from "@/components/chat/chat-app"

// The page for one chat: /chat/<chatId>
export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  const { chatId } = await params

  // key makes the page start fresh when we move to another chat
  return <ChatApp key={chatId} chatId={chatId} />
}
