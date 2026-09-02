export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type CodeFormat = "json" | "curl" | "javascript";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function buildIndexNowPayload({
  host,
  key,
  keyLocation,
  urlList,
}: Omit<IndexNowPayload, "keyLocation"> & {
  keyLocation?: string;
}): IndexNowPayload {
  return {
    host,
    key,
    keyLocation: keyLocation || `https://${host}/${key}.txt`,
    urlList,
  };
}

export function generateIndexNowCode(
  payload: IndexNowPayload,
  format: CodeFormat
): string {
  const json = JSON.stringify(payload, null, 2);

  if (format === "json") return json;

  if (format === "curl") {
    return [
      "curl --request POST \\",
      "  --url https://api.indexnow.org/indexnow \\",
      "  --header 'Content-Type: application/json; charset=utf-8' \\",
      `  --data ${shellQuote(json)}`,
    ].join("\n");
  }

  return [
    "const response = await fetch('https://api.indexnow.org/indexnow', {",
    "  method: 'POST',",
    "  headers: { 'Content-Type': 'application/json; charset=utf-8' },",
    `  body: JSON.stringify(${json.replace(/\n/g, "\n  ")}),`,
    "});",
    "",
    "if (!response.ok) {",
    "  throw new Error(`IndexNow request failed: ${response.status}`);",
    "}",
  ].join("\n");
}
