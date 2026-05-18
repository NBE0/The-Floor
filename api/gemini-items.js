const ITEMS_PER_CATEGORY = 40;
// Fallbacks: if 2.5-flash is overloaded, the older models usually have spare capacity.
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

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

export default async function handler(req, res) {
  const category = (req.query.category || '').toString().trim();
  const geminiKey = (req.query.geminiKey || '').toString().trim();

  if (!category) {
    return res.status(400).json({ error: 'category query param is required' });
  }
  if (!geminiKey) {
    return res.status(400).json({ error: 'geminiKey query param is required' });
  }

  const body = {
    contents: [{
      parts: [{
        text: `Generate a list of exactly ${ITEMS_PER_CATEGORY} distinct, visually recognizable types of "${category}".
               Focus on items that are easy to identify in a picture.
               Return ONLY a JSON array of strings in Hebrew.
               Example format: ["item1", "item2", ...]`
      }]
    }]
  };

  let lastStatus = 0;
  let lastDetail = '';

  // Try each model in order; for the first model, also retry once on transient errors.
  for (let m = 0; m < GEMINI_MODELS.length; m++) {
    const model = GEMINI_MODELS[m];
    const maxAttempts = m === 0 ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const upstream = await callGemini(model, geminiKey, body);

        if (upstream.ok) {
          const data = await upstream.json();
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textResponse) {
            return res.status(502).json({ error: 'Unexpected Gemini response shape' });
          }
          const jsonString = textResponse.replace(/```json|```/g, '').trim();
          let items;
          try { items = JSON.parse(jsonString); }
          catch { return res.status(502).json({ error: 'Gemini returned non-JSON content' }); }
          if (!Array.isArray(items)) {
            return res.status(502).json({ error: 'Gemini did not return an array' });
          }
          return res.status(200).json({ items: items.slice(0, ITEMS_PER_CATEGORY) });
        }

        lastStatus = upstream.status;
        lastDetail = (await upstream.text()).slice(0, 500);

        // Stop early on auth / quota / bad-request — retrying won't help.
        if (!TRANSIENT_STATUS.has(upstream.status)) break;

        // Wait briefly before next attempt of the SAME model (only happens once)
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
}
