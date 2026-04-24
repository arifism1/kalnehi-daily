#!/usr/bin/env node
/**
 * GSC Diagnostics: Check canonical consistency across hosts and sitemaps
 * Usage: node scripts/gsc-diagnostics.js [host]
 *
 * Examples:
 *   node scripts/gsc-diagnostics.js kalnehi.com
 *   node scripts/gsc-diagnostics.js www.kalnehi.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const TEST_URLS = [
  '/vs/notion',
  '/vs/google-calendar',
  '/neet',
  '/jee',
  '/upsc',
  '/pricing',
  '/about',
  '/features',
  '/guides',
];

async function fetchUrl(urlString) {
  return new Promise((resolve, reject) => {
    const client = urlString.startsWith('https') ? https : http;
    client
      .get(urlString, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel="?canonical"?[^>]*href="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractMetaRobots(html) {
  const match = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/i);
  return match ? match[1] : null;
}

async function checkHost(host) {
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const results = [];

  console.log(`\n📊 Checking host: ${host}\n`);

  for (const path of TEST_URLS) {
    const fullUrl = `${protocol}://${host}${path}`;
    try {
      const html = await fetchUrl(fullUrl);
      const canonical = extractCanonical(html);
      const robots = extractMetaRobots(html);

      results.push({
        path,
        url: fullUrl,
        canonical,
        robots: robots || '(none)',
        status: '✓',
      });

      console.log(
        `  ${path.padEnd(25)} → canonical: ${
          canonical ? canonical.padEnd(40) : '(not found)'.padEnd(40)
        } | robots: ${robots || '(not set)'}`,
      );
    } catch (error) {
      results.push({
        path,
        url: fullUrl,
        error: error.message,
        status: '✗',
      });
      console.log(
        `  ${path.padEnd(25)} → ✗ ERROR: ${error.message}`,
      );
    }
  }

  return results;
}

async function checkSitemapHosts() {
  console.log('\n🗺️  Sitemap Host Check\n');

  const hosts = ['kalnehi.com', 'www.kalnehi.com'];

  for (const host of hosts) {
    try {
      const protocol = 'https';
      const sitemapUrl = `${protocol}://${host}/sitemap-pages.xml`;
      const xml = await fetchUrl(sitemapUrl);

      // Extract first 5 <loc> entries
      const locRegex = /<loc>([^<]+)<\/loc>/g;
      const matches = xml.match(locRegex) || [];
      const locs = matches
        .slice(0, 5)
        .map((m) => m.replace(/<\/?loc>/g, ''));

      console.log(`  Sitemap host: ${host}`);
      console.log(`  Sample URLs:`);
      locs.forEach((loc) => {
        const u = new URL(loc);
        console.log(`    - ${u.hostname}${u.pathname}`);
      });
      console.log('');
    } catch (error) {
      console.log(
        `  ✗ Could not fetch from ${host}: ${error.message}\n`,
      );
    }
  }
}

async function main() {
  const hostArg = process.argv[2] || 'kalnehi.com';
  const alsoCheck = hostArg === 'kalnehi.com' ? 'www.kalnehi.com' : 'kalnehi.com';

  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log(
    '   GSC Diagnostics: Canonical & Robots Consistency Check   ',
  );
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );

  await checkHost(hostArg);
  await checkHost(alsoCheck);
  await checkSitemapHosts();

  console.log(
    '═══════════════════════════════════════════════════════════════\n',
  );
  console.log('✅ Diagnostics complete. Check for:');
  console.log('   1. Canonical mismatch between hosts');
  console.log('   2. noindex or robots=nofollow tags');
  console.log('   3. Sitemap host consistency\n');
}

main().catch((e) => {
  console.error('❌ Script error:', e.message);
  process.exit(1);
});
