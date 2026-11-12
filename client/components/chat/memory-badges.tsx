import { Badge } from "@/components/ui/badge"

export type Snippet = {
  chatId: string
  role: string
  text: string
  createdAt: string
  answer?: string
}

// Makes a date like "Nov 12, 2:03 PM"
function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// Shows one badge for each message we remembered from an earlier chat.
// If there is nothing to show, it shows nothing.
export default function MemoryBadges({ snippets }: { snippets?: Snippet[] }) {
  if (!snippets || snippets.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {snippets.map((snippet, index) => (
        <Badge key={index} variant="outline" title={snippet.answer ? snippet.text + " → " + snippet.answer : snippet.text}>
          From earlier chat · {formatDate(snippet.createdAt)}
        </Badge>
      ))}
    </div>
  )
}
