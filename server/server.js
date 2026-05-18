// Local dev server — mirrors the Vercel serverless functions in /api so that
// `npm run start` (Vite + Express together) works end-to-end without
// needing `vercel dev`. In production, Vercel handles /api/* and this file
// is not used at all.
import express from 'express';
import cors from 'cors';
import { existsSync, readdirSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = 3001;

const ITEMS_PER_CATEGORY = 40;
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const LOCAL_IMAGES_DIR = join(__dirname, 'local_categories');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']);
const FALLBACK_SERPER_API_KEY = process.env.SERPER_API_KEY || '';

if (!existsSync(LOCAL_IMAGES_DIR)) mkdirSync(LOCAL_IMAGES_DIR);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/local-images', express.static(LOCAL_IMAGES_DIR));

// ── /api/gemini-items ────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGemini(model, geminiKey, body) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(geminiKey)}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

app.get('/api/gemini-items', async (req, res) => {
  const category = (req.query.category || '').toString().trim();
  const geminiKey = (req.query.geminiKey || '').toString().trim();

  if (!category) return res.status(400).json({ error: 'category query param is required' });
  if (!geminiKey) return res.status(400).json({ error: 'geminiKey query param is required' });

  const body = {
    contents: [{
      parts: [{
        text: `Generate a list of exactly ${ITEMS_PER_CATEGORY} distinct, visually recognizable types of "${category}".
               Focus on items that are easy to identify in a picture.
               Return ONLY a JSON array of strings in Hebrew.
               Example format: ["פריט 1", "פריט 2", ...]`
      }]
    }]
  };

  let lastStatus = 0;
  let lastDetail = '';

  for (let m = 0; m < GEMINI_MODELS.length; m++) {
    const model = GEMINI_MODELS[m];
    const maxAttempts = m === 0 ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const upstream = await callGemini(model, geminiKey, body);

        if (upstream.ok) {
          const data = await upstream.json();
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textResponse) return res.status(502).json({ error: 'Unexpected Gemini response shape' });
          const jsonString = textResponse.replace(/```json|```/g, '').trim();
          let items;
          try { items = JSON.parse(jsonString); }
          catch { return res.status(502).json({ error: 'Gemini returned non-JSON content' }); }
          if (!Array.isArray(items)) return res.status(502).json({ error: 'Gemini did not return an array' });
          return res.json({ items: items.slice(0, ITEMS_PER_CATEGORY) });
        }

        lastStatus = upstream.status;
        lastDetail = (await upstream.text()).slice(0, 500);
        if (!TRANSIENT_STATUS.has(upstream.status)) break;
        if (attempt < maxAttempts - 1) await sleep(1500);
      } catch (err) {
        lastStatus = 0;
        lastDetail = err.message;
      }
    }
  }

  const friendly =
    lastStatus === 503 || lastStatus === 429
      ? 'Gemini is overloaded right now. Wait a few seconds and click Fetch again.'
      : `Gemini error (${lastStatus || 'network'})`;
  return res.status(lastStatus || 502).json({ error: friendly, detail: lastDetail });
});

// ── /api/serper-image ────────────────────────────────────────────────────────
app.get('/api/serper-image', async (req, res) => {
  const item = (req.query.item || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const serperKey = (req.query.serperKey || '').toString().trim() || FALLBACK_SERPER_API_KEY;

  if (!item || !category) return res.status(400).json({ error: 'item and category query params are required' });
  if (!serperKey) return res.status(400).json({ error: 'serperKey query param is required' });

  try {
    const upstream = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${item} ${category} product isolated white background`,
        gl: 'il',
        num: 1,
      }),
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({
        error: `Serper error (${upstream.status})`,
        detail: errText.slice(0, 500),
      });
    }
    const data = await upstream.json();
    const imageUrl = data?.images?.[0]?.imageUrl ?? null;
    return res.json({ url: imageUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Network error contacting Serper', detail: err.message });
  }
});

// ── /api/local-images (dev only) ─────────────────────────────────────────────
app.get('/api/local-images', (req, res) => {
  const category = req.query.category;
  if (!category) return res.status(400).json({ error: 'category required' });
  const dir = join(LOCAL_IMAGES_DIR, category);
  if (!existsSync(dir)) return res.json([]);
  try {
    const files = readdirSync(dir)
      .filter(f => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))
      .map(f => `/local-images/${encodeURIComponent(category)}/${encodeURIComponent(f)}`);
    res.json(files);
  } catch { res.json([]); }
});

app.listen(PORT, () => {
  console.log(`[server] The Floor dev API running on http://localhost:${PORT}`);
});
