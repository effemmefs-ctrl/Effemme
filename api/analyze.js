// api/analyze.js — Integrador IA + Bling ERP + Snapost
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const blingKey = process.env.BLING_API_KEY;

  if (!anthropicKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada na Vercel.' });
  }

  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma foto enviada.' });
    }

    // 1. CHAMA A IA (CLAUDE VISION) PARA ANALISAR O PRODUTO
    const prompt = `Você é um catalogador de e-commerce e estrategista de marketing da EFFEMME.
Analise detalhadamente a foto deste produto e retorne ESTRITAMENTE um JSON sem markdown, sem crases:

{
  "produto": {
    "nome": "Nome comercial elegante, claro e atraente para venda no Brasil",
    "preco": 129.90,
    "preco_custo": 49.90,
    "descricao": "Descrição sofisticada de 2 a 3 parágrafos destacando acabamento, usabilidade e benefícios.",
    "categoria": "Moda",
    "sku": "EFF-${Date.now().toString().slice(-6)}"
  },
  "social": {
    "instagram": "Legenda autêntica com emojis, storytelling e chamada para clicar no link da bio",
    "tiktok": "Roteiro/gancho dinâmico e direto para vídeo",
    "hashtags": ["15 hashtags estratégicas sem o símbolo #"]
  }
}`;

    const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha na análise da IA');
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content?.find(b => b.type === 'text')?.text || '{}';
    const cleanJson = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    // 2. CADASTRA O PRODUT
