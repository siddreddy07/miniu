// For now we keep the user id and the current chat id in the browser (localStorage).
// A real login would replace the user id later.

// The user id is made once and stays the same for this browser
export function getUserId() {
  let id = localStorage.getItem("user-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("user-id", id)
  }
  return id
}

// The chat that is open right now. A new one is made if there is none.
export function getChatId() {
  let id = localStorage.getItem("chat-id")
  if (!id) {
    id = newChatId()
  }
  return id
}

export function setChatId(id: string) {
  localStorage.setItem("chat-id", id)
}

export function newChatId() {
  const id = crypto.randomUUID()
  localStorage.setItem("chat-id", id)
  return id
}
