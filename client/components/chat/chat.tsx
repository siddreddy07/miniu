"use client"

import { useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

import { getChatId } from "@/lib/chat-id"
import { Button } from "@/components/ui/button"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"

const apiUrl = process.env.NEXT_PUBLIC_API_URL + "/api/chat"

// Waits until we have the chat id (localStorage only works in the browser)
export default function Chat() {
  const [chatId, setChatId] = useState("")

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChatId(getChatId())
  }, [])

  if (chatId === "") return null
  return <ChatBox chatId={chatId} />
}

function ChatBox({ chatId }: { chatId: string }) {
  const [input, setInput] = useState("")

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: apiUrl }),
  })

  const isBusy = status === "submitted" || status === "streaming"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim() === "" || isBusy) return
    sendMessage({ text: input })
    setInput("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter makes a new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="mx-auto flex h-svh max-w-2xl flex-col p-4">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align={message.role === "user" ? "end" : "start"}>
                    <MessageContent
                      className={
                        message.role === "user"
                          ? "rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                          : ""
                      }
                    >
                      {message.parts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <p key={index} className="whitespace-pre-wrap">
                              {part.text}
                            </p>
                          )
                        }
                        return null
                      })}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}

              {status === "submitted" && (
                <p className="text-sm text-muted-foreground">Thinking...</p>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {error && (
        <div className="flex items-center gap-2 py-2 text-sm text-red-500">
          <span>Something went wrong.</span>
          <Button variant="outline" size="sm" onClick={() => regenerate()}>
            Retry
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask something..."
          rows={1}
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
        />
        {isBusy ? (
          <Button type="button" variant="outline" onClick={() => stop()}>
            Stop
          </Button>
        ) : (
          <Button type="submit">Send</Button>
        )}
      </form>
    </div>
  )
}
