type JsonLdProps = {
  data: Record<string, unknown>
}

/**
 * Renders a structured-data block. `</script>` is escaped so a translated
 * string can never break out of the JSON island.
 */
export default function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
