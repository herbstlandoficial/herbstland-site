const { randomUUID } = require('crypto');

const PRODUCTS = {
  'CAMISETA OVERSIZED FRIENDS': { price: 49.9, colors: ['Branco', 'Preto'], sizes: ['M', 'G'] },
  'CAMISETA OVERSIZED PEANUTS SNOOPY CHARLIE BROWN': { price: 54.9, colors: ['Preto'], sizes: ['M', 'G'] },
  'CAMISETA QUERIA SURTAR MAS TÔ SEM TEMPO': { price: 54.9, colors: ['Branco'], sizes: ['M', 'G'] },
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });

  const token = process.env.MP_ACCESS_TOKEN_TEST;
  const environment = String(process.env.MP_ENVIRONMENT || '').toLowerCase();
  if (!token || environment !== 'test') {
    return json(503, { error: 'O pagamento Pix de teste ainda não está configurado.' });
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Pedido inválido.' }); }

  const clean = (value, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const email = clean(input.email, 254);
  const fullName = clean(input.fullName, 120);
  const phone = clean(input.phone, 30);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Informe um e-mail válido.' });
  if (fullName.split(/\s+/).filter(Boolean).length < 2) return json(400, { error: 'Informe nome e sobrenome.' });
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 20) {
    return json(400, { error: 'O carrinho está vazio ou contém itens demais.' });
  }

  let subtotal = 0;
  let count = 0;
  const items = [];
  for (const row of input.items) {
    const product = PRODUCTS[row?.name];
    const quantity = Number(row?.quantity);
    if (!product || !product.colors.includes(row.color) || !product.sizes.includes(row.size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return json(400, { error: 'Um produto do carrinho não é válido. Atualize a página e tente novamente.' });
    }
    count += quantity;
    if (count > 30) return json(400, { error: 'O limite por pedido é de 30 unidades.' });
    subtotal += product.price * quantity;
    items.push({
      name: row.name,
      color: row.color,
      size: row.size,
      quantity,
      price: product.price,
      unitPrice: product.price,
      lineTotal: Math.round(product.price * quantity * 100) / 100,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const discount = Math.round(subtotal * 0.05 * 100) / 100;
  const amount = Math.round((subtotal - discount) * 100) / 100;
  const externalReference = `herbstland-pix-${randomUUID()}`;
  const diagnosticId = randomUUID();

  // O fluxo de teste oficial do Pix usa o pagador APRO para gerar uma order sandbox.
  // Em produção, a integração deverá usar os dados reais do comprador e credenciais live.
  const requestBody = {
    type: 'online',
    processing_mode: 'automatic',
    external_reference: externalReference,
    total_amount: amount.toFixed(2),
    payer: {
      email: 'test_payer@example.com',
      first_name: 'APRO',
    },
    transactions: {
      payments: [{
        amount: amount.toFixed(2),
        payment_method: { id: 'pix', type: 'bank_transfer' },
      }],
    },
  };

  try {
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify(requestBody),
    });

    let result = {};
    try { result = await response.json(); } catch { /* resposta sem JSON */ }

    if (!response.ok) {
      console.error('HERBSTLAND_PIX_DIAGNOSTIC', JSON.stringify({
        diagnosticId,
        endpoint: '/v1/orders',
        httpStatus: response.status,
        apiError: String(result.error || '').slice(0, 100),
        apiMessage: String(result.message || '').slice(0, 240),
        causes: Array.isArray(result.cause) ? result.cause.slice(0, 5).map(item => ({
          code: String(item.code || ''),
          description: String(item.description || '').slice(0, 180),
        })) : [],
      }));
      return json(502, { error: 'O Mercado Pago não conseguiu gerar o Pix de teste. Consulte o diagnóstico no Netlify.', diagnosticId });
    }

    const payment = result.transactions?.payments?.[0] || {};
    const method = payment.payment_method || {};
    const qrCode = method.qr_code || method.qr_code_base64 && '';
    if (!result.id || !qrCode) {
      console.error('HERBSTLAND_PIX_DIAGNOSTIC', JSON.stringify({
        diagnosticId,
        stage: 'order_created_without_qr',
        orderId: String(result.id || ''),
        orderStatus: String(result.status || ''),
        paymentStatus: String(payment.status || ''),
        paymentStatusDetail: String(payment.status_detail || ''),
        responseKeys: Object.keys(result || {}),
      }));
      return json(502, { error: 'O Mercado Pago criou a solicitação, mas não retornou o código Pix. Consulte o diagnóstico no Netlify.', diagnosticId });
    }

    const expiration = method.expiration_time || payment.expiration_time || result.expiration_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return json(200, {
      paymentId: String(payment.id || result.id),
      orderId: String(result.id),
      status: String(result.status || payment.status || 'pending'),
      statusDetail: String(result.status_detail || payment.status_detail || ''),
      orderNumber: String(result.id),
      amount,
      subtotal,
      discount,
      items,
      qrCode,
      qrCodeBase64: String(method.qr_code_base64 || ''),
      ticketUrl: String(method.ticket_url || ''),
      expiration,
      diagnosticId,
      testMode: true,
    });
  } catch (error) {
    console.error('HERBSTLAND_PIX_DIAGNOSTIC', JSON.stringify({
      diagnosticId,
      endpoint: '/v1/orders',
      stage: 'network_or_runtime_error',
      message: String(error?.message || 'unknown').slice(0, 200),
    }));
    return json(502, { error: 'Não foi possível conectar ao Mercado Pago para gerar o Pix. Tente novamente.', diagnosticId });
  }
};
