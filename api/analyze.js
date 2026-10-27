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

    // 2. CADASTRA O PRODUTO NO BLING ERP AUTOMATICAMENTE
    let blingResultado = null;

    if (blingKey) {
      const p = cleanJson.produto;
      const xmlProduto = `<?xml version="1.0" encoding="UTF-8"?>
<produto>
  <codigo>${p.sku}</codigo>
  <descricao>${p.nome.replace(/&/g, '&amp;')}</descricao>
  <situacao>Ativo</situacao>
  <vlr_unit>${p.preco}</vlr_unit>
  <preco_custo>${p.preco_custo}</preco_custo>
  <descricaoCurta>${p.descricao.replace(/&/g, '&amp;')}</descricaoCurta>
  <unidade>UN</unidade>
  <origem>0</origem>
</produto>`;

      const blingUrl = `https://bling.com.br/Api/v2/produto/json/`;
      const params = new URLSearchParams();
      params.append('apikey', blingKey);
      params.append('xml', xmlProduto);

      const blingResp = await fetch(blingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const blingData = await blingResp.json().catch(() => ({}));
      blingResultado = blingData?.retorno?.produtos?.[0]?.produto || blingData?.retorno;
    }

    // 3. DEVOLVE TUDO PRONTO PARA O SEU CELULAR / APLICATIVO
    return res.status(200).json({
      sucesso: true,
      produto_criado: cleanJson.produto,
      status_bling: blingResultado ? 'Cadastrado no Bling com sucesso!' : 'Aguardando chave Bling',
      redes_sociais: cleanJson.social
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar integração' });
  }
}
