#!/usr/bin/env node
/**
 * GSC API Script: Submit sitemaps and fetch coverage data
 *
 * Requires:
 *   - npm install googleapis@latest
 *   - Google Cloud service account with webmasters API enabled
 *   - Service account JSON stored in environment or file
 *
 * Usage:
 *   # Submit sitemap
 *   node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
 *
 *   # Get coverage data
 *   node scripts/gsc-api.js coverage kalnehi.com
 *
 * Environment variables:
 *   - GOOGLE_SEARCH_CONSOLE_SA: Service account JSON (stringify or path)
 *   - NEXT_PUBLIC_SITE_URL: Site URL (e.g., https://kalnehi.com)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Parse service account from env or file
function getServiceAccount() {
  const saJson = process.env.GOOGLE_SEARCH_CONSOLE_SA || '';
  if (!saJson) {
    throw new Error(
      'GOOGLE_SEARCH_CONSOLE_SA env var not set. ' +
      'Provide a service account JSON or path to JSON file.',
    );
  }

  // If it looks like a file path, read it
  if (saJson.startsWith('/') || saJson.startsWith('.')) {
    const fullPath = path.resolve(saJson);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Service account file not found: ${fullPath}`);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }

  // Otherwise treat as JSON string
  try {
    return JSON.parse(saJson);
  } catch (e) {
    throw new Error(
      `Failed to parse GOOGLE_SEARCH_CONSOLE_SA. ` +
      `Expected JSON string or file path: ${e.message}`,
    );
  }
}

async function createAuthClient() {
  const sa = getServiceAccount();
  return new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
}

/**
 * Submit a sitemap to Google Search Console
 * @param {string} sitemapUrl Full URL to sitemap (e.g., https://kalnehi.com/sitemap.xml)
 */
async function submitSitemap(sitemapUrl) {
  const auth = await createAuthClient();
  const webmasters = google.webmasters({ version: 'v1', auth });

  const siteUrl = new URL(sitemapUrl);
  const hostname = siteUrl.hostname;

  // Use sc-domain: for simpler matching; can also use https://domain.com for URL-prefix property
  const property = `sc-domain:${hostname}`;

  console.log(`\n📤 Submitting sitemap to Google Search Console`);
  console.log(`   Property: ${property}`);
  console.log(`   Sitemap:  ${sitemapUrl}\n`);

  try {
    const result = await webmasters.sitemaps.submit({
      siteUrl: property,
      requestBody: {
        sitemapUrl,
      },
    });

    console.log('✅ Sitemap submitted successfully!');
    if (result.data) {
      console.log(JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    if (error.code === 409) {
      console.log('⚠️  Sitemap already submitted (409 Conflict)');
    } else {
      console.error('❌ Error submitting sitemap:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Fetch coverage data from GSC
 * @param {string} hostname Site hostname (e.g., kalnehi.com)
 */
async function getCoverageData(hostname) {
  const auth = await createAuthClient();
  const webmasters = google.webmasters({ version: 'v1', auth });

  const property = `sc-domain:${hostname}`;

  console.log(`\n📊 Fetching coverage data from Google Search Console`);
  console.log(`   Property: ${property}\n`);

  try {
    // Note: The webmasters.sites API is limited; for detailed coverage analytics,
    // you may need to use the searchanalytics API or manually check GSC UI
    const result = await webmasters.sites.get({ siteUrl: property });

    console.log('✅ Site info retrieved:');
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Error fetching coverage data:', error.message);
    process.exit(1);
  }
}

/**
 * List all sitemaps for a site
 * @param {string} hostname Site hostname
 */
async function listSitemaps(hostname) {
  const auth = await createAuthClient();
  const webmasters = google.webmasters({ version: 'v1', auth });

  const property = `sc-domain:${hostname}`;

  console.log(`\n📋 Listing sitemaps for ${property}\n`);

  try {
    const result = await webmasters.sitemaps.list({
      siteUrl: property,
    });

    if (result.data.sitemap && result.data.sitemap.length > 0) {
      console.log('✅ Sitemaps found:');
      result.data.sitemap.forEach((sm, i) => {
        console.log(`   ${i + 1}. ${sm.path}`);
        if (sm.lastSubmitted) {
          console.log(`      Last submitted: ${sm.lastSubmitted}`);
        }
        if (sm.lastDownloaded) {
          console.log(`      Last downloaded: ${sm.lastDownloaded}`);
        }
        if (sm.isSitemapIndex) {
          console.log(`      Type: Sitemap Index`);
        }
      });
    } else {
      console.log('ℹ️  No sitemaps found for this property.');
    }
  } catch (error) {
    console.error('❌ Error listing sitemaps:', error.message);
    process.exit(1);
  }
}

async function main() {
  const [command, arg] = process.argv.slice(2);

  if (!command) {
    console.log(`
Usage:
  node scripts/gsc-api.js submit <sitemap-url>
  node scripts/gsc-api.js coverage <hostname>
  node scripts/gsc-api.js list-sitemaps <hostname>

Examples:
  node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
  node scripts/gsc-api.js coverage kalnehi.com
  node scripts/gsc-api.js list-sitemaps kalnehi.com

Environment variables:
  GOOGLE_SEARCH_CONSOLE_SA - Service account JSON (string or file path)
  NEXT_PUBLIC_SITE_URL - Your site URL (optional, for convenience)
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'submit': {
        if (!arg) {
          console.error('❌ Error: sitemap URL required');
          console.error('Usage: node scripts/gsc-api.js submit <sitemap-url>');
          process.exit(1);
        }
        await submitSitemap(arg);
        break;
      }
      case 'coverage': {
        if (!arg) {
          console.error('❌ Error: hostname required');
          console.error('Usage: node scripts/gsc-api.js coverage <hostname>');
          process.exit(1);
        }
        await getCoverageData(arg);
        break;
      }
      case 'list-sitemaps': {
        if (!arg) {
          console.error('❌ Error: hostname required');
          console.error('Usage: node scripts/gsc-api.js list-sitemaps <hostname>');
          process.exit(1);
        }
        await listSitemaps(arg);
        break;
      }
      default: {
        console.error(`❌ Unknown command: ${command}`);
        console.error('Use: submit, coverage, or list-sitemaps');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main();
