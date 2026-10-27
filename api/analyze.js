// api/analyze.js — Integrador IA + Bling ERP + Snapost (Corrigido para fotos pesadas)
export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Permite fotos pesadas de celular
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const blingKey = process.env.BLING_API_KEY;

  if (!anthropicKey) {
    return res.status(500).json({ error: 'Chave ANTHROPIC_API_KEY não configurada na Vercel.' });
  }

  try {
    // 1. DESEMBALA O CORPO DA REQUISIÇÃO COM SEGURANÇA
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err) {
        body = {};
      }
    }

    const imageBase64 = body?.imageBase64 || req.body?.imageBase64;
    const mediaType = body?.mediaType
