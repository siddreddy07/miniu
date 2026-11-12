// Gets the chat id from localStorage, or makes a new one
export function getChatId() {
  let id = localStorage.getItem("chat-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("chat-id", id)
  }
  return id
}
