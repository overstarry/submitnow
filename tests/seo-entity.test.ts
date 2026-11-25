import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { classifyMdxHref } from '../lib/mdx-links.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

function readText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readJson<T = Record<string, unknown>>(relPath: string): T {
  return JSON.parse(readText(relPath)) as T;
}

test('classifyMdxHref routes internal paths through locale-aware Link without double-prefixing', () => {
  assert.equal(classifyMdxHref('/'), 'localized-internal');
  assert.equal(classifyMdxHref('/tools/sitemap-diff'), 'localized-internal');
  assert.equal(classifyMdxHref('/docs/status-codes/403'), 'localized-internal');
  assert.equal(classifyMdxHref('/compare'), 'localized-internal');
  assert.equal(classifyMdxHref('/pricing'), 'localized-internal');

  // Already locale-prefixed links stay raw so next-intl never produces /zh/zh/...
  assert.equal(classifyMdxHref('/zh/docs/status-codes/403'), 'raw-internal');
  assert.equal(classifyMdxHref('/ja/tools/indexnow-key-checker'), 'raw-internal');
  assert.equal(classifyMdxHref('/en/about'), 'raw-internal');

  // Static files, hashes, and external links stay raw <a>
  assert.equal(classifyMdxHref('/llms.txt'), 'raw-internal');
  assert.equal(classifyMdxHref('/sitemap.xml'), 'raw-internal');
  assert.equal(classifyMdxHref('#section'), 'raw-internal');
  assert.equal(classifyMdxHref('mailto:test@example.com'), 'raw-internal');
  assert.equal(classifyMdxHref('https://www.indexnow.org/documentation'), 'external');
  assert.equal(classifyMdxHref(undefined), 'raw-internal');
});

test('llms.txt and llms-full.txt use canonical www.submitnow.dev URLs and list /compare and /pricing', () => {
  for (const file of ['public/llms.txt', 'public/llms-full.txt']) {
    const content = readText(file);
    assert.ok(
      content.includes('https://www.submitnow.dev/compare'),
      `${file} should link to /compare on canonical host`
    );
    assert.ok(
      content.includes('https://www.submitnow.dev/pricing'),
      `${file} should link to /pricing on canonical host`
    );
    assert.doesNotMatch(
      content,
      /https:\/\/submitnow\.dev\b/,
      `${file} must not contain non-canonical apex https://submitnow.dev links`
    );
    assert.doesNotMatch(
      content,
      /overstarry\/indexNow-gui/i,
      `${file} should reference canonical overstarry/submitnow repository`
    );
  }

  assert.ok(
    readText('config/site.ts').includes('https://github.com/overstarry/submitnow'),
    'config/site.ts SOURCE_CODE_URL should point to overstarry/submitnow'
  );
  assert.ok(
    readText('config/site.ts').includes('https://www.npmjs.com/package/submitnow-mcp'),
    'config/site.ts NPM_PACKAGE_URL should point to submitnow-mcp on npm'
  );
  assert.ok(
    readText('lib/structured-data.ts').includes('NPM_PACKAGE_URL'),
    'lib/structured-data.ts should include NPM_PACKAGE_URL in Organization.sameAs'
  );
});

test('localized compare and pricing datasets stay complete across en, zh, and ja', () => {
  for (const locale of ['en', 'zh', 'ja']) {
    const compare = readJson<{
      title: string;
      shortAnswer: string;
      matrix: { headers: string[]; rows: string[][] };
      scenarios: { headers: string[]; rows: string[][] };
      faq: { question: string; answer: string }[];
    }>(`content/compare/${locale}.json`);

    assert.ok(compare.shortAnswer.toLowerCase().includes('submitnow'));
    assert.ok(compare.matrix.rows.length >= 5, `${locale} compare matrix should cover >= 5 options`);
    for (const row of compare.matrix.rows) {
      assert.equal(row.length, compare.matrix.headers.length);
    }
    assert.ok(compare.scenarios.rows.length >= 4);
    assert.ok(compare.faq.length >= 4);

    const pricing = readJson<{
      title: string;
      shortAnswer: string;
      tiers: { id: string; price: string; highlights: string[] }[];
      quotasTable: { headers: string[]; rows: string[][] };
      faq: { question: string; answer: string }[];
    }>(`content/pricing/${locale}.json`);

    assert.ok(pricing.shortAnswer.toLowerCase().includes('submitnow'));
    assert.equal(pricing.tiers.length, 2);
    assert.ok(pricing.quotasTable.rows.length >= 5);
    for (const row of pricing.quotasTable.rows) {
      assert.equal(row.length, pricing.quotasTable.headers.length);
    }
    assert.ok(pricing.faq.length >= 4);
  }
});

test('localized i18n messages keep brand entity consistency and eliminate sitemapDiff contradictions', () => {
  for (const locale of ['en', 'zh', 'ja']) {
    const msg = readJson<{
      Header: { links: { name: string; href: string }[] };
      Home: { heroTitle: string; description: string };
      Tools: {
        submitterCard: { cta: string };
        sitemapDiff: { article: { faq: { items: { question: string; answer: string }[] }; specTable: { rows: string[][] } } };
        keyChecker: { article: { specTable: { rows: string[][] } } };
        codeGenerator: { article: { specTable: { rows: string[][] }; faq: { items: { question: string; answer: string }[] } } };
        [key: string]: unknown;
      };
    }>(`i18n/messages/${locale}.json`);

    const navHrefs = msg.Header.links.map((l) => l.href);
    assert.ok(navHrefs.includes('/compare'), `${locale} Header should include /compare`);
    assert.ok(navHrefs.includes('/pricing'), `${locale} Header should include /pricing`);
    assert.ok(msg.Home.heroTitle.toLowerCase().includes('submitnow'));
    assert.ok(msg.Home.description.toLowerCase().includes('submitnow'));
    assert.ok(msg.Tools.submitterCard.cta.toLowerCase().includes('submitnow'));

    const sitemapFaqText = JSON.stringify(msg.Tools.sitemapDiff.article.faq.items);
    assert.doesNotMatch(sitemapFaqText, /only plain XML is parsed|counted but not exported|请先解压|会计数但不会导出|プレーンな XML のみ|件数は数えますが書き出しません/);
    assert.ok(msg.Tools.sitemapDiff.article.specTable.rows.length >= 4);
    assert.ok(msg.Tools.keyChecker.article.specTable.rows.length >= 4);
    assert.ok(msg.Tools.codeGenerator.article.specTable.rows.length >= 6);

    for (const toolKey of [
      'keyGenerator',
      'keyChecker',
      'batchBuilder',
      'sitemapDiff',
      'codeGenerator',
      'urlNormalizer',
    ]) {
      const toolObj = msg.Tools[toolKey] as {
        article: { relatedPosts: { slug: string }[] };
      };
      assert.ok(
        toolObj.article.relatedPosts.length >= 2,
        `${locale} Tools.${toolKey} should link to >= 2 related blog posts`
      );
      assert.ok(
        JSON.stringify(toolObj.article).toLowerCase().includes('submitnow'),
        `${locale} Tools.${toolKey} article should explicitly name submitnow`
      );
    }
  }
});
