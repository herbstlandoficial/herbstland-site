const crypto = require('crypto');

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, body };
}

exports.handler = async () => {
  const clientId = process.env.ME_CLIENT_ID;
  const redirectUri = process.env.ME_REDIRECT_URI;
  const stateSecret = process.env.ME_STATE_SECRET;
  if (!clientId || !redirectUri || !stateSecret) {
    return response(500, '<h1>Configuração incompleta</h1><p>Configure ME_CLIENT_ID, ME_REDIRECT_URI e ME_STATE_SECRET nas variáveis da Netlify.</p>');
  }

  const payload = `${Date.now()}.${crypto.randomBytes(24).toString('hex')}`;
  const signature = crypto.createHmac('sha256', stateSecret).update(payload).digest('hex');
  const state = `${payload}.${signature}`;
  const scopes = ['ecommerce-shipping', 'shipping-calculate'];
  const authorizationUrl = new URL('https://melhorenvio.com.br/oauth/authorize');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: scopes.join(' ')
  }).toString();

  return { statusCode: 302, headers: { Location: authorizationUrl.toString(), 'Cache-Control': 'no-store' }, body: '' };
};
