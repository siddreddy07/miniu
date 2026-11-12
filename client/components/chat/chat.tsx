"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"

import ToolCall, { type SearchPart } from "@/components/chat/tool-call"
import SourceBadges from "@/components/chat/source-badges"
import MemoryBadges, { type Snippet } from "@/components/chat/memory-badges"
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

type ChatProps = {
  userId: string
  chatId: string
  initialMessages: UIMessage[]
  // Called when a reply is finished, so the sidebar can reload
  onSaved: () => void
}

export default function Chat({
  userId,
  chatId,
  initialMessages,
  onSaved,
}: ChatProps) {
  const [input, setInput] = useState("")

  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    id: chatId,
    messages: initialMessages,
    // The server needs the userId to keep each user's chats and memory apart
    transport: new DefaultChatTransport({ api: apiUrl, body: { userId } }),
    onFinish: () => onSaved(),
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
    <div className="mx-auto flex h-[calc(100svh-3rem)] w-full max-w-2xl flex-col p-4">
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              {messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align={message.role === "user" ? "end" : "start"}>
                    <MessageContent
                      // w-fit: the bubble is only as wide as its text (max 80% of the row)
                      className={
                        message.role === "user"
                          ? "w-fit max-w-[80%] rounded-2xl bg-primary px-3 py-2 text-primary-foreground"
                          : "w-fit max-w-[80%] rounded-2xl bg-muted px-3 py-2"
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
                        if (part.type === "data-memory") {
                          const data = (part as unknown as { data: Snippet[] })
                            .data
                          return <MemoryBadges key={index} snippets={data} />
                        }
                        if (part.type === "tool-webSearch") {
                          const searchPart = part as unknown as SearchPart

                          const results = (searchPart.output?.results ??
                            []) as { title: string; url: string }[]

                          return (
                            <div key={index} className="flex flex-col gap-1.5">
                              <ToolCall part={searchPart} />

                              <SourceBadges results={results} />
                            </div>
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
          <span>{error.message}</span>
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
