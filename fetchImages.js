/**
 * fetchImages.js
 *
 * One-time utility script — run manually before playing:
 *   node fetchImages.js
 *
 * Reads server/imageDb.json for categories and items, queries the Wikipedia
 * API for a thumbnail image URL per item, and updates server/imageDb.json.
 *
 * - Safe to re-run: already-fetched items are read from the existing
 *   imageDb.json and skipped (cached), so interrupted runs can resume.
 * - Requires Node 18+ (uses built-in fetch).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const OUTPUT_FILE      = join(__dirname, 'server', 'imageDb.json');
const LOCAL_IMAGES_DIR = join(__dirname, 'server', 'local_categories');

const WIKI_API  = 'https://en.wikipedia.org/w/api.php';
const THUMB_SIZE = 600;   // px — wide enough for the duel screen
const DELAY_MS   = 350;   // polite delay between Wikipedia requests

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Query Wikipedia for the main thumbnail of an article whose title best
// matches `item`. Returns the image URL string, or null if not found.
async function fetchImageUrl(item) {
  // Step 1: search for the most relevant article title
  const searchParams = new URLSearchParams({
    action:   'query',
    list:     'search',
    srsearch: item,
    srlimit:  '1',
    format:   'json',
    origin:   '*',
  });

  let title;
  try {
    const searchRes  = await fetch(`${WIKI_API}?${searchParams}`);
    const searchData = await searchRes.json();
    title = searchData?.query?.search?.[0]?.title;
  } catch (err) {
    console.error(`  [search error] "${item}":`, err.message);
    return null;
  }

  if (!title) return null;

  // Step 2: fetch the thumbnail for that article
  const imgParams = new URLSearchParams({
    action:      'query',
    titles:       title,
    prop:         'pageimages',
    pithumbsize:  String(THUMB_SIZE),
    format:       'json',
    origin:       '*',
  });

  try {
    const imgRes  = await fetch(`${WIKI_API}?${imgParams}`);
    const imgData = await imgRes.json();
    const pages   = imgData?.query?.pages ?? {};
    const page    = Object.values(pages)[0];
    return page?.thumbnail?.source ?? null;
  } catch (err) {
    console.error(`  [image error] "${item}" (title: "${title}"):`, err.message);
    return null;
  }
}

async function main() {
  // Load existing DB — categories and items are derived from its keys
  let db = existsSync(OUTPUT_FILE)
    ? JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    : {};

  let total = 0;
  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (const [category, itemMap] of Object.entries(db)) {
    const items = Object.keys(itemMap);
    console.log(`\n📂  ${category}`);

    // Skip 1: category has a local image folder — no API fetch needed
    if (existsSync(join(LOCAL_IMAGES_DIR, category))) {
      console.log(`    ⏭  Skipped — local folder exists`);
      continue;
    }

    // Skip 2: category already has any entries in the DB — skip entirely
    if (Object.keys(db[category] ?? {}).length > 0) {
      console.log(`    ⏭  Skipped — already has entries in DB`);
      continue;
    }

    if (!db[category]) db[category] = {};

    for (const item of items) {
      total++;

      // Skip already-fetched items
      if (db[category][item]) {
        console.log(`    ✓ ${item} (cached)`);
        cached++;
        continue;
      }

      process.stdout.write(`    Fetching "${item}" ... `);
      const url = await fetchImageUrl(item);

      if (url) {
        db[category][item] = url;
        console.log('✓');
        fetched++;
      } else {
        db[category][item] = null; // record the miss so re-runs skip it
        console.log('✗  not found');
        failed++;
      }

      // Persist after every item so progress is never lost
      writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 2), 'utf-8');

      await sleep(DELAY_MS);
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅  Done  —  ${OUTPUT_FILE}`);
  console.log(`   Fetched : ${fetched}`);
  console.log(`   Cached  : ${cached}`);
  console.log(`   Failed  : ${failed}`);
  console.log(`   Total   : ${total}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
