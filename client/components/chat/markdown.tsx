import ReactMarkdown from "react-markdown"

type Source = { title: string; url: string }

// Turns citations like [1] or 【1】 into markdown links to the matching source.
// Source number 1 is the first search result, number 2 the second, and so on.
function addCitationLinks(text: string, sources: Source[]) {
  return text.replace(/[[【](\d+)[\]】]/g, (match, number) => {
    const source = sources[Number(number) - 1]
    if (!source) return match
    return "[" + number + "](" + source.url + ")"
  })
}

export default function Markdown({
  text,
  sources,
}: {
  text: string
  sources: Source[]
}) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
        ),
        a: ({ href, children }) => {
          // A link whose text is only a number is a citation: show it as a small pill
          const isCitation = /^\d+$/.test(String(children))
          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={
                isCitation
                  ? "mx-0.5 inline-block rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary no-underline hover:bg-primary/20"
                  : "underline"
              }
            >
              {isCitation ? "[" + children + "]" : children}
            </a>
          )
        },
      }}
    >
      {addCitationLinks(text, sources)}
    </ReactMarkdown>
  )
}
