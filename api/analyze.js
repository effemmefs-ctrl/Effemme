export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;
    
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image }
            },
            {
              type: 'text',
              text: `Analise esta foto e crie conteúdo para redes sociais em português brasileiro. Retorne APENAS JSON válido sem markdown:
{"tipo":"selfie|produto|comida|lugar|evento|pet|fitness|outro","instagram":"legenda engajante com emojis (max 150 chars)","tiktok":"legenda curta e viral com call to action (max 100 chars)","twitter":"tweet direto e impactante (max 200 chars)","linkedin":"texto profissional e inspirador (max 200 chars)","facebook":"texto amigável e completo (max 200 chars)","hashtags":["hashtag1","hashtag2","hashtag3","hashtag4","hashtag5","hashtag6","hashtag7","hashtag8","hashtag9","hashtag10"],"descricao":"descrição breve do que aparece na foto"}`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: `Anthropic error ${response.status}`, detail: errText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { error: 'Parse error', raw: text };
    }
    
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
