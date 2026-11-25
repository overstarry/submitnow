export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type CodeFormat =
  | "json"
  | "curl"
  | "javascript"
  | "python"
  | "go"
  | "github-actions";

const DEFAULT_CODEGEN_ENDPOINT = "https://api.indexnow.org/indexnow";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function goStringLiteral(value: string): string {
  return JSON.stringify(value);
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
  format: CodeFormat,
  endpointUrl = DEFAULT_CODEGEN_ENDPOINT
): string {
  const json = JSON.stringify(payload, null, 2);

  if (format === "json") return json;

  if (format === "curl") {
    return [
      "curl --request POST \\",
      `  --url ${shellQuote(endpointUrl)} \\`,
      "  --header 'Content-Type: application/json; charset=utf-8' \\",
      `  --data ${shellQuote(json)}`,
    ].join("\n");
  }

  if (format === "javascript") {
    return [
      `const response = await fetch(${JSON.stringify(endpointUrl)}, {`,
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

  if (format === "python") {
    return [
      "import json",
      "import urllib.request",
      "",
      `payload = ${json}`,
      `request = urllib.request.Request(`,
      `    ${JSON.stringify(endpointUrl)},`,
      `    data=json.dumps(payload).encode("utf-8"),`,
      `    headers={"Content-Type": "application/json; charset=utf-8"},`,
      `    method="POST",`,
      ")",
      "",
      "with urllib.request.urlopen(request, timeout=15) as response:",
      '    print(f"IndexNow HTTP {response.status}")',
    ].join("\n");
  }

  if (format === "go") {
    const urlsLines = payload.urlList
      .map((u) => `\t\t${goStringLiteral(u)},`)
      .join("\n");
    return [
      "package main",
      "",
      "import (",
      '\t"bytes"',
      '\t"encoding/json"',
      '\t"fmt"',
      '\t"net/http"',
      '\t"time"',
      ")",
      "",
      "func main() {",
      "\tpayload := map[string]any{",
      `\t\t"host":        ${goStringLiteral(payload.host)},`,
      `\t\t"key":         ${goStringLiteral(payload.key)},`,
      `\t\t"keyLocation": ${goStringLiteral(payload.keyLocation)},`,
      '\t\t"urlList": []string{',
      urlsLines,
      "\t\t},",
      "\t}",
      "\tbody, err := json.Marshal(payload)",
      "\tif err != nil {",
      "\t\tpanic(err)",
      "\t}",
      "",
      "\tclient := &http.Client{Timeout: 15 * time.Second}",
      `\tresp, err := client.Post(${goStringLiteral(endpointUrl)}, "application/json; charset=utf-8", bytes.NewReader(body))`,
      "\tif err != nil {",
      "\t\tpanic(err)",
      "\t}",
      "\tdefer resp.Body.Close()",
      '\tfmt.Printf("IndexNow HTTP %d\\n", resp.StatusCode)',
      "}",
    ].join("\n");
  }

  // github-actions: production-ready workflow using GitHub secret for the key
  const urlsJson = JSON.stringify(payload.urlList)
    .replaceAll("\\", "\\\\")
    .replaceAll("$", "\\$")
    .replaceAll("`", "\\`");
  const escapedKeyLocation = JSON.stringify(
    payload.keyLocation.replace(payload.key, "__INDEXNOW_KEY_PLACEHOLDER__")
  )
    .replaceAll("\\", "\\\\")
    .replaceAll("$", "\\$")
    .replaceAll("`", "\\`")
    .replace("__INDEXNOW_KEY_PLACEHOLDER__", "${INDEXNOW_KEY}");
  return [
    "name: Notify IndexNow",
    "",
    "on:",
    "  workflow_dispatch:",
    "  push:",
    "    branches: [main]",
    "",
    "jobs:",
    "  indexnow:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - name: Submit URLs to IndexNow",
    "        env:",
    "          INDEXNOW_KEY: ${{ secrets.INDEXNOW_KEY }}",
    "        run: |",
    `          curl --fail-with-body --request POST ${shellQuote(endpointUrl)} \\`,
    "            --header 'Content-Type: application/json; charset=utf-8' \\",
    '            --data "$(cat <<EOF',
    "          {",
    `            "host": ${JSON.stringify(payload.host)},`,
    '            "key": "${INDEXNOW_KEY}",',
    `            "keyLocation": ${escapedKeyLocation},`,
    `            "urlList": ${urlsJson}`,
    "          }",
    "          EOF",
    '          )"',
  ].join("\n");
}
