// For now the user id lives in the browser (localStorage).
// A real login would replace it later. The chat id lives in the URL: /chat/<chatId>

// The user id is made once and stays the same for this browser
export function getUserId() {
  let id = localStorage.getItem("user-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("user-id", id)
  }
  return id
}

// A new chat gets a new random id
export function newChatId() {
  return crypto.randomUUID()
}
