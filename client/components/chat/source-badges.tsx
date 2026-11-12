import { ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

type Result = { title: string; url: string }

// Gets the website name from a link, like "bbc.com"
function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

// One clickable chip for each web result. The number matches [1], [2] in the answer.
export default function SourceBadges({ results }: { results: Result[] }) {
  if (!results || results.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {results.map((result, index) => (
        <Badge
          key={result.url}
          variant="outline"
          className="h-6 cursor-pointer gap-1.5 bg-background px-2 hover:bg-muted"
          render={
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              title={result.title}
            />
          }
        >
          <span className="font-semibold text-primary">{index + 1}</span>
          <span className="max-w-32 truncate">{getDomain(result.url)}</span>
          <ExternalLinkIcon className="text-muted-foreground" />
        </Badge>
      ))}
    </div>
  )
}
