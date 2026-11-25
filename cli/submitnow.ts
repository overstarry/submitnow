#!/usr/bin/env node
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  fetchRemoteSitemapEntries,
  generateSecureKey,
  submitIndexNowBatches,
  verifyRemoteKeyFile,
} from '../lib/indexnow-runtime.ts';

export type ParsedCliArgs = {
  command: string;
  flags: Record<string, string | boolean>;
  urls: string[];
};

export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [command = 'help', ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const urls: string[] = [];
  let collectingUrls = false;

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--urls') {
      collectingUrls = true;
      continue;
    }

    if (token.startsWith('--')) {
      collectingUrls = false;
      const eqIndex = token.indexOf('=');
      if (eqIndex !== -1) {
        flags[token.slice(2, eqIndex)] = token.slice(eqIndex + 1);
      } else {
        const key = token.slice(2);
        const next = rest[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i += 1;
        } else {
          flags[key] = true;
        }
      }
      continue;
    }

    if (collectingUrls) {
      urls.push(token);
    }
  }

  return { command, flags, urls };
}

function getStringFlag(
  flags: Record<string, string | boolean>,
  name: string
): string | undefined {
  const value = flags[name];
  return typeof value === 'string' ? value : undefined;
}

const HELP_TEXT = `submitnow CLI — Zero-dependency IndexNow command-line tool

Usage:
  node cli/submitnow.ts <command> [options]

Commands:
  generate-key [--write] [--dir <path>]
      Generate a 48-char hex IndexNow key (optionally write <key>.txt).

  check-key --host <host> --key <key> [--key-location <url>]
      Verify a public IndexNow key file with SSRF guards and full diagnostics.

  fetch-sitemap --url <sitemapUrl> [--lastmod-days <n>] [--json]
      Fetch a sitemap.xml, .xml.gz, or nested sitemap index and list URLs.

  submit [--key <key>] [--host <host>] [--key-location <url>]
         [--endpoint indexnow|bing|yandex|seznam|naver|yep]
         [--urls <url1> <url2>...] [--file <path>]
         [--sitemap <sitemapUrl> [--lastmod-days <n>]]
         [--dry-run] [--json]
      Validate and submit URLs (auto-chunks lists > 10,000). Falls back to
      INDEXNOW_KEY environment variable when --key is omitted.
`;

export async function runCli(argv: string[]): Promise<number> {
  const { command, flags, urls } = parseCliArgs(argv);

  if (command === 'help' || command === '--help' || command === '-h' || flags.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  if (command === 'generate-key') {
    const key = generateSecureKey();
    if (flags.write) {
      const targetDir = getStringFlag(flags, 'dir') ?? process.cwd();
      const targetFile = path.join(targetDir, `${key}.txt`);
      await fs.writeFile(targetFile, key, 'utf-8');
      process.stdout.write(
        JSON.stringify({ key, file: targetFile }, null, 2) + '\n'
      );
    } else {
      process.stdout.write(`${key}\n`);
    }
    return 0;
  }

  if (command === 'check-key') {
    const host = getStringFlag(flags, 'host') ?? '';
    const key = getStringFlag(flags, 'key') ?? process.env.INDEXNOW_KEY ?? '';
    const keyLocation = getStringFlag(flags, 'key-location');

    const result = await verifyRemoteKeyFile({ host, key, keyLocation });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result.ok && result.valid ? 0 : 1;
  }

  if (command === 'fetch-sitemap') {
    const url = getStringFlag(flags, 'url') ?? '';
    const lastmodStr = getStringFlag(flags, 'lastmod-days');
    const maxAgeDays = lastmodStr ? Number(lastmodStr) : null;

    const result = await fetchRemoteSitemapEntries({ url, maxAgeDays });
    if (!result.ok) {
      process.stderr.write(JSON.stringify(result, null, 2) + '\n');
      return 1;
    }

    if (flags.json) {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    } else {
      for (const entry of result.entries) {
        process.stdout.write(`${entry.url}\n`);
      }
    }
    return 0;
  }

  if (command === 'submit') {
    const key = getStringFlag(flags, 'key') ?? process.env.INDEXNOW_KEY ?? '';
    const host = getStringFlag(flags, 'host');
    const keyLocation = getStringFlag(flags, 'key-location');
    const endpointId = getStringFlag(flags, 'endpoint');
    const filePath = getStringFlag(flags, 'file');
    const sitemapUrl = getStringFlag(flags, 'sitemap');
    const lastmodStr = getStringFlag(flags, 'lastmod-days');
    const dryRun = Boolean(flags['dry-run']);

    const collected: string[] = [...urls];

    if (filePath) {
      const content = await fs.readFile(filePath, 'utf-8');
      collected.push(content);
    }

    if (sitemapUrl) {
      const maxAgeDays = lastmodStr ? Number(lastmodStr) : null;
      const fetched = await fetchRemoteSitemapEntries({
        url: sitemapUrl,
        maxAgeDays,
      });
      if (!fetched.ok) {
        process.stderr.write(JSON.stringify(fetched, null, 2) + '\n');
        return 1;
      }
      collected.push(...fetched.entries.map((entry) => entry.url));
    }

    const result = await submitIndexNowBatches({
      urls: collected,
      key,
      host,
      keyLocation,
      endpointId,
      dryRun,
    });

    const output = JSON.stringify(result, null, 2) + '\n';
    if (result.ok) {
      process.stdout.write(output);
      return 0;
    }
    process.stderr.write(output);
    return 1;
  }

  process.stderr.write(`Unknown command: ${command}\n\n${HELP_TEXT}`);
  return 1;
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const resolvedEntry = fsSync.realpathSync(entry);
    return import.meta.url === pathToFileURL(resolvedEntry).href;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(entry)).href;
  }
}

if (isExecutedDirectly()) {
  runCli(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    });
}
