export default async function handler(req, res) {
  const item = (req.query.item || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const serperKey = (req.query.serperKey || '').toString().trim();

  if (!item || !category) {
    return res.status(400).json({ error: 'item and category query params are required' });
  }
  if (!serperKey) {
    return res.status(400).json({ error: 'serperKey query param is required' });
  }

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
    const url = data?.images?.[0]?.imageUrl ?? null;
    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ error: 'Network error contacting Serper', detail: err.message });
  }
}
