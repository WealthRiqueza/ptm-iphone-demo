// PTM PREGAME AI bridge — server-side only. Deploy to a serverless host.
// Required env: OPENAI_API_KEY, PTM_ACCESS_TOKEN. Never expose them in browser code.
// This bridge does NOT fetch Setka or validate a predictive model.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const expected = process.env.PTM_ACCESS_TOKEN;
  const key = process.env.OPENAI_API_KEY;
  if (!expected || !key) return res.status(503).json({error:'SERVER_NOT_CONFIGURED',decision:'DESCARTAR',amount_usd:0});
  if (req.headers.authorization !== 'Bearer ' + expected) return res.status(401).json({error:'UNAUTHORIZED'});
  const body = req.body || {};
  const playerA = String(body.player_a || '').trim().slice(0,100);
  const playerB = String(body.player_b || '').trim().slice(0,100);
  if (!playerA || !playerB || playerA === playerB) return res.status(400).json({error:'INVALID_MATCH'});
  // No arbitrary URL fetch / scraping / market orders. Evidence must be separately authenticated.
  const observations = typeof body.observations === 'string' ? body.observations.slice(0,12000) : '';
  try {
    const response = await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({
        model:process.env.PTM_OPENAI_MODEL || 'gpt-4.1-mini',
        store:false,
        instructions:'Eres un asistente de investigación PTM. Resume únicamente observaciones proporcionadas, separa hechos de hipótesis, no inventes Setka, probabilidades, cuotas, horarios ni permisos. Nunca declares una probabilidad independiente validada sin evidencia externa de calibración. Responde en español. No recomiendes apuestas.',
        input:'Partido: '+playerA+' vs '+playerB+'\nObservaciones NO AUTENTICADAS:\n'+(observations || 'Ninguna'),
        max_output_tokens:900
      })
    });
    if (!response.ok) return res.status(502).json({error:'MODEL_UNAVAILABLE',decision:'DESCARTAR',amount_usd:0});
    const data = await response.json();
    const summary=(data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
    return res.status(200).json({
      player_a:playerA,player_b:playerB,summary,
      source_verified:false,independent_probability:'SIN VERIFICAR',
      ptm_70_filter:'NO APROBADO',edge:'SIN VERIFICAR',
      decision:'DESCARTAR',amount_usd:0,
      notice:'La IA no certifica resultados Setka ni valida probabilidades.'
    });
  } catch {
    return res.status(502).json({error:'BRIDGE_ERROR',decision:'DESCARTAR',amount_usd:0});
  }
}
