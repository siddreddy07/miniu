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

export default function SourceBadges({ results }: { results: Result[] }) {
  if (!results || results.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {results.map((result, index) => (
        <Badge
          key={result.url}
          variant="secondary"
          render={
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              title={result.title}
            />
          }
        >
          [{index + 1}] {getDomain(result.url)}
        </Badge>
      ))}
    </div>
  )
}
