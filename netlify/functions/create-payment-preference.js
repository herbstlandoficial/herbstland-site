const { randomUUID } = require('crypto');

const PRODUCTS = {
  'CAMISETA OVERSIZED FRIENDS': {
    price: 49.9,
    colors: ['Branco', 'Preto'],
    sizes: ['M', 'G'],
  },
  'CAMISETA OVERSIZED PEANUTS SNOOPY CHARLIE BROWN': {
    price: 54.9,
    colors: ['Preto'],
    sizes: ['M', 'G'],
  },
  'CAMISETA QUERIA SURTAR MAS TÔ SEM TEMPO': {
    price: 54.9,
    colors: ['Branco'],
    sizes: ['M', 'G'],
  },
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Método não permitido.' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN_TEST;
  const siteUrl = process.env.URL;
  if (!accessToken || process.env.MP_ENVIRONMENT !== 'test' || !siteUrl) {
    return json(503, { error: 'O pagamento de teste ainda não está configurado.' });
  }

  let origin;
  try {
    origin = new URL(siteUrl).origin;
    if (!origin.startsWith('https://')) throw new Error('HTTPS obrigatório');
  } catch {
    return json(503, { error: 'A URL pública segura da loja não está configurada.' });
  }

  let input;
  try {
    input = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Pedido inválido.' });
  }

  const clean = (value, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const email = clean(input.email, 254);
  const fullName = clean(input.fullName, 120);
  const phone = clean(input.phone, 30);
  const cep = clean(input.cep, 9);
  const street = clean(input.address, 180);
  const complement = clean(input.complement, 120);
  const city = clean(input.city, 100);
  const state = clean(input.state, 2).toUpperCase();
  const delivery = clean(input.delivery, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Informe um e-mail válido.' });
  }
  if (fullName.split(/\s+/).filter(Boolean).length < 2 || !phone || !/^\d{5}-?\d{3}$/.test(cep)
    || !street || !city || !/^[A-Z]{2}$/.test(state) || !delivery) {
    return json(400, { error: 'Confira os dados de contato e entrega antes de continuar.' });
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    return json(400, { error: 'O carrinho está vazio ou contém itens demais.' });
  }

  const items = [];
  let unitCount = 0;
  for (const cartItem of input.items) {
    const product = PRODUCTS[cartItem?.name];
    const quantity = Number(cartItem?.quantity);
    if (!product || !product.colors.includes(cartItem.color) || !product.sizes.includes(cartItem.size)
      || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return json(400, { error: 'Um produto do carrinho não é válido. Atualize a página e tente novamente.' });
    }
    unitCount += quantity;
    if (unitCount > 30) return json(400, { error: 'O limite por pedido é de 30 unidades.' });
    items.push({
      id: 'herbstland-' + Object.keys(PRODUCTS).indexOf(cartItem.name),
      title: `${cartItem.name} — ${cartItem.color}, tamanho ${cartItem.size}`,
      quantity,
      currency_id: 'BRL',
      unit_price: product.price,
    });
  }

  const [payerName, ...surnameParts] = fullName.split(/\s+/);
  const preference = {
    items,
    payer: {
      email,
      name: payerName,
      surname: surnameParts.join(' '),
      phone: { area_code: phone.replace(/\D/g, '').slice(0, 2), number: phone.replace(/\D/g, '').slice(2) },
      address: { street_name: street, zip_code: cep.replace(/\D/g, '') },
    },
    metadata: {
      herbstland_contact_name: fullName,
      herbstland_contact_phone: phone,
      herbstland_shipping_cep: cep,
      herbstland_shipping_address: street,
      herbstland_shipping_complement: complement,
      herbstland_shipping_city: city,
      herbstland_shipping_state: state,
      herbstland_delivery_method: delivery,
    },
    external_reference: `herbstland-${randomUUID()}`,
    // Não definir default_payment_method_id: o Mercado Pago deve oferecer os meios elegíveis para esta conta.
    back_urls: {
      success: `${origin}/checkout.html?payment=success`,
      pending: `${origin}/checkout.html?payment=pending`,
      failure: `${origin}/checkout.html?payment=failure`,
    },
    auto_return: 'approved',
    statement_descriptor: 'HERBSTLAND',
  };

  // Diagnóstico seguro: registra somente metadados técnicos da resposta do Mercado Pago.
  // Nunca registrar Access Token, dados do comprador, endereço, telefone ou corpo integral.
  const diagnosticId = randomUUID();
  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify(preference),
    });

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      const causes = Array.isArray(result.cause)
        ? result.cause.slice(0, 8).map((item) => ({
            code: String(item?.code || '').slice(0, 100),
            description: String(item?.description || '').slice(0, 300),
          }))
        : [];
      console.error('HERBSTLAND_MP_DIAGNOSTIC', JSON.stringify({
        diagnosticId,
        stage: 'preference_creation',
        httpStatus: response.status,
        apiError: String(result.error || '').slice(0, 120),
        apiMessage: String(result.message || '').slice(0, 300),
        causes,
      }));
      return json(502, {
        error: 'Não foi possível iniciar o pagamento. Tente novamente em instantes.',
        diagnosticId,
      });
    }

    const sandboxUrl = result.sandbox_init_point;
    const initPoint = result.init_point;
    console.log('HERBSTLAND_MP_DIAGNOSTIC', JSON.stringify({
      diagnosticId,
      stage: 'preference_created',
      httpStatus: response.status,
      preferenceId: String(result.id || ''),
      sandboxInitPointReturned: Boolean(sandboxUrl),
      sandboxInitPointHost: sandboxUrl ? (() => { try { return new URL(sandboxUrl).hostname; } catch { return 'invalid'; } })() : null,
      productionInitPointReturned: Boolean(initPoint),
      responseHasPaymentMethods: Boolean(result.payment_methods),
      paymentMethodTypes: Array.isArray(result.payment_methods?.excluded_payment_types)
        ? result.payment_methods.excluded_payment_types.map((item) => String(item?.id || '').slice(0, 40))
        : [],
      responseKeys: Object.keys(result).sort(),
    }));

    if (!sandboxUrl) {
      console.error('HERBSTLAND_MP_DIAGNOSTIC', JSON.stringify({
        diagnosticId,
        stage: 'missing_sandbox_init_point',
        httpStatus: response.status,
        responseKeys: Object.keys(result).sort(),
      }));
      return json(502, {
        error: 'O Mercado Pago não retornou um checkout de teste.',
        diagnosticId,
      });
    }
    const checkoutUrl = new URL(sandboxUrl);
    if (!checkoutUrl.hostname.startsWith('sandbox.mercadopago.com')) {
      console.error('HERBSTLAND_MP_DIAGNOSTIC', JSON.stringify({
        diagnosticId,
        stage: 'unexpected_checkout_host',
        checkoutHost: checkoutUrl.hostname,
      }));
      return json(502, {
        error: 'O endereço de checkout de teste retornado não é válido.',
        diagnosticId,
      });
    }
    return json(200, { checkoutUrl: checkoutUrl.toString(), diagnosticId });
  } catch (error) {
    console.error('HERBSTLAND_MP_DIAGNOSTIC', JSON.stringify({
      diagnosticId,
      stage: 'network_or_runtime_error',
      message: String(error?.message || 'unknown error').slice(0, 300),
    }));
    return json(502, {
      error: 'Não foi possível conectar ao Mercado Pago. Tente novamente.',
      diagnosticId,
    });
  }
};
