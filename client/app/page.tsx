"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { newChatId } from "@/lib/chat-id"

// Opening "/" starts a new chat: we make an id and go to /chat/<id>
export default function Page() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/chat/" + newChatId())
  }, [router])

  return null
}
