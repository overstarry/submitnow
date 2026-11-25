import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeUrlList,
  chunkUrls,
  diffSitemapEntries,
  filterSitemapEntriesByLastMod,
  normalizeUrlList,
  parseRobotsTxtSitemaps,
  parseSitemapXmlString,
} from '../lib/seo-tools.ts';

test('analyzeUrlList deduplicates, groups by host, and isolates invalid inputs', () => {
  const raw = [
    'https://a.example.com/1',
    'https://a.example.com/1',
    'https://b.example.com/2',
    'not-a-url',
    'ftp://a.example.com/file',
  ].join('\n');

  const analysis = analyzeUrlList(raw);
  assert.equal(analysis.inputCount, 5);
  assert.equal(analysis.validUrls.length, 2);
  assert.equal(analysis.duplicateCount, 1);
  assert.deepEqual(analysis.invalidInputs, ['not-a-url', 'ftp://a.example.com/file']);
  assert.equal(analysis.hostGroups.length, 2);
});

test('normalizeUrlList distinguishes duplicate normalized URLs from invalid inputs', () => {
  const raw = [
    'https://example.com/post#top',
    'https://example.com/post#bottom',
    'https://example.com/post?utm_source=x&id=1',
    'https://example.com/post?id=1',
    'bad-url',
  ].join('\n');

  const results = normalizeUrlList(raw, {
    removeFragment: true,
    removeTrackingParameters: true,
    sortQueryParameters: false,
    removeTrailingSlash: false,
  });

  const validResults = results.filter((r) => Boolean(r.normalized));
  const uniqueValid = new Set(validResults.map((r) => r.normalized));
  const invalidCount = results.length - validResults.length;
  const duplicateCount = validResults.length - uniqueValid.size;

  assert.equal(uniqueValid.size, 2);
  assert.equal(duplicateCount, 2);
  assert.equal(invalidCount, 1);
});

test('parseSitemapXmlString parses urlset with namespaces, CDATA, entities, and duplicates', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
    <!-- comment -->
    <sm:url>
      <sm:loc>https://example.com/a?x=1&amp;y=2</sm:loc>
      <sm:lastmod>2026-11-24</sm:lastmod>
    </sm:url>
    <sm:url>
      <sm:loc><![CDATA[https://example.com/b]]></sm:loc>
      <sm:lastmod>2026-11-20T12:00:00Z</sm:lastmod>
    </sm:url>
    <sm:url>
      <sm:loc>https://example.com/b</sm:loc>
    </sm:url>
    <sm:url>
      <sm:loc>relative/path</sm:loc>
    </sm:url>
  </sm:urlset>`;

  const parsed = parseSitemapXmlString(xml);
  assert.equal(parsed.type, 'urlset');
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].url, 'https://example.com/a?x=1&y=2');
  assert.equal(parsed.entries[0].lastModified, '2026-11-24');
  assert.equal(parsed.entries[1].url, 'https://example.com/b');
  assert.equal(parsed.duplicateCount, 1);
  assert.deepEqual(parsed.invalidLocations, ['relative/path']);
});

test('parseSitemapXmlString parses sitemapindex and rejects broken XML', () => {
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap><loc>https://example.com/sitemap-posts.xml</loc></sitemap>
    <sitemap><loc>https://example.com/sitemap-pages.xml.gz</loc></sitemap>
  </sitemapindex>`;

  const parsedIndex = parseSitemapXmlString(indexXml);
  assert.equal(parsedIndex.type, 'index');
  assert.deepEqual(parsedIndex.childSitemaps, [
    'https://example.com/sitemap-posts.xml',
    'https://example.com/sitemap-pages.xml.gz',
  ]);

  const broken = parseSitemapXmlString('<urlset><url><loc>https://example.com/</loc></url>');
  assert.equal(broken.error, 'invalid_xml');
});

test('diffSitemapEntries detects added, changed, removed, and unchanged entries', () => {
  const prev = [
    { url: 'https://example.com/keep', lastModified: '2026-11-01' },
    { url: 'https://example.com/edit', lastModified: '2026-11-01' },
    { url: 'https://example.com/gone', lastModified: '2026-11-01' },
  ];
  const curr = [
    { url: 'https://example.com/keep', lastModified: '2026-11-01' },
    { url: 'https://example.com/edit', lastModified: '2026-11-24' },
    { url: 'https://example.com/new', lastModified: '2026-11-25' },
  ];

  const diff = diffSitemapEntries(prev, curr);
  assert.deepEqual(diff.added.map((e) => e.url), ['https://example.com/new']);
  assert.deepEqual(diff.changed.map((e) => e.url), ['https://example.com/edit']);
  assert.deepEqual(diff.removed.map((e) => e.url), ['https://example.com/gone']);
  assert.equal(diff.unchangedCount, 1);
});

test('filterSitemapEntriesByLastMod filters within age window and tracks missing/older entries', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const entries = [
    { url: 'https://example.com/today', lastModified: '2026-11-25T08:00:00Z' },
    { url: 'https://example.com/week', lastModified: '2026-11-20' },
    { url: 'https://example.com/old', lastModified: '2026-10-01' },
    { url: 'https://example.com/nodate' },
  ];

  const last7 = filterSitemapEntriesByLastMod(entries, 7, now);
  assert.deepEqual(last7.matched.map((e) => e.url), [
    'https://example.com/today',
    'https://example.com/week',
  ]);
  assert.equal(last7.olderCount, 1);
  assert.equal(last7.withoutLastModCount, 1);

  const all = filterSitemapEntriesByLastMod(entries, null, now);
  assert.equal(all.matched.length, 4);
});

test('chunkUrls splits lists by both count and UTF-8 byte budget', () => {
  const urls = Array.from({ length: 25 }, (_, i) => `https://example.com/${i}`);
  const chunks = chunkUrls(urls, 10);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 10);
  assert.equal(chunks[1].length, 10);
  assert.equal(chunks[2].length, 5);
  assert.deepEqual(chunkUrls([], 10), []);

  // Byte-budget splitting prevents > 1 MB Server Action payloads for long URLs
  const longUrls = Array.from(
    { length: 20 },
    (_, i) => `https://example.com/${'a'.repeat(180)}/${i}`
  );
  const byteChunks = chunkUrls(longUrls, 10_000, 1024);
  assert.ok(byteChunks.length >= 4);
  assert.equal(byteChunks.flat().length, 20);
});

test('parseRobotsTxtSitemaps extracts unique valid http(s) Sitemap directives and ignores comments', () => {
  const robots = `
    User-agent: *
    Allow: /
    # Sitemap: https://example.com/commented.xml
    Sitemap: https://example.com/sitemap_index.xml
    sitemap: https://example.com/sitemap-posts.xml # trailing comment
    Sitemap: https://example.com/sitemap_index.xml
    Sitemap: /relative-sitemap.xml
  `;
  assert.deepEqual(parseRobotsTxtSitemaps(robots), [
    'https://example.com/sitemap_index.xml',
    'https://example.com/sitemap-posts.xml',
  ]);
});
