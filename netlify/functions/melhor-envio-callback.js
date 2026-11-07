const crypto = require('crypto');

const html = (title, message, statusCode = 200) => ({
  statusCode,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  body: `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px Arial,sans-serif;max-width:640px;margin:12vh auto;padding:24px;color:#222"><h1>${title}</h1><p>${message}</p><p>Você pode fechar esta janela e voltar à HERBSTLAND.</p></body></html>`
});

function validState(state, secret) {
  if (!state || !secret) return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [timestamp, nonce, received] = parts;
  if (!/^\d+$/.test(timestamp) || !/^[a-f0-9]{48}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(received)) return false;
  const age = Date.now() - Number(timestamp);
  if (age < 0 || age > 15 * 60 * 1000) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${nonce}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'));
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  if (q.error) return html('Autorização não concluída', 'O Melhor Envio não concedeu autorização. Volte à HERBSTLAND e tente novamente.', 400);
  if (!q.code || !validState(q.state, process.env.ME_STATE_SECRET)) {
    return html('Não foi possível validar a autorização', 'O código está ausente ou a validação de segurança expirou. Inicie a conexão novamente pela HERBSTLAND.', 400);
  }

  const { ME_CLIENT_ID: clientId, ME_CLIENT_SECRET: clientSecret, ME_REDIRECT_URI: redirectUri,
    SUPABASE_URL: supabaseUrl, SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ME_CONTACT_EMAIL: contactEmail } = process.env;
  if (!clientId || !clientSecret || !redirectUri || !supabaseUrl || !serviceRoleKey || !contactEmail) {
    return html('Configuração incompleta', 'A autorização chegou, mas faltam variáveis seguras no servidor. Nenhuma credencial foi exibida.', 500);
  }

  try {
    const tokenResponse = await fetch('https://melhorenvio.com.br/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': `HERBSTLAND (${contactEmail})`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: q.code
      })
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.refresh_token) {
      return html('Falha ao concluir a autorização', `O Melhor Envio recusou a troca do código (HTTP ${tokenResponse.status}). Confira Client ID, Secret e se a URL de callback é idêntica à cadastrada.`, 502);
    }

    const base = supabaseUrl.replace(/\/$/, '');
    const saveResponse = await fetch(`${base}/rest/v1/private_integrations?on_conflict=integration`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        integration: 'melhor_envio',
        credentials: tokenData,
        updated_at: new Date().toISOString()
      })
    });
    if (!saveResponse.ok) {
      return html('Autorização recebida, mas não foi possível salvar', 'A tabela segura do Supabase ainda não está pronta ou as variáveis de servidor estão incorretas. Não tente compartilhar tokens; configure o banco e autorize novamente.', 500);
    }
    return html('HERBSTLAND conectada ao Melhor Envio!', 'A autorização foi concluída e as credenciais foram armazenadas no servidor com segurança.');
  } catch (_) {
    return html('Erro de comunicação', 'Não foi possível concluir a comunicação entre a Netlify, o Supabase e o Melhor Envio. Tente novamente mais tarde.', 502);
  }
};
