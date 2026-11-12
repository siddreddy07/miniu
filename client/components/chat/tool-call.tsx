// The part sent by the server when the model uses the webSearch tool
export type SearchPart = {
  state: string
  input?: { query?: string }
  output?: { query?: string; results?: unknown[]; error?: string }
}

export default function ToolCall({ part }: { part: SearchPart }) {
  const query = part.input?.query ?? part.output?.query ?? ""

  if (part.state === "output-error" || part.output?.error) {
    return <p className="text-xs text-red-500">Search failed</p>
  }

  if (part.state === "output-available") {
    return <p className="text-xs text-muted-foreground">Searched: {query}</p>
  }

  return <p className="text-xs text-muted-foreground">Searching: {query}</p>
}
