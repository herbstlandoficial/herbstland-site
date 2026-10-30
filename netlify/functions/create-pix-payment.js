const { randomUUID } = require('crypto');
const PRODUCTS = {
  'CAMISETA OVERSIZED FRIENDS': { price: 49.9, colors: ['Branco', 'Preto'], sizes: ['M', 'G'] },
  'CAMISETA OVERSIZED PEANUTS SNOOPY CHARLIE BROWN': { price: 54.9, colors: ['Preto'], sizes: ['M', 'G'] },
  'CAMISETA QUERIA SURTAR MAS TÔ SEM TEMPO': { price: 54.9, colors: ['Branco'], sizes: ['M', 'G'] },
};
const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
function validCPF(value) {
  const cpf = String(value || '').replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0; for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11; if (digit === 10) digit = 0; if (digit !== Number(cpf[9])) return false;
  sum = 0; for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11; if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });
  const token = process.env.MP_ACCESS_TOKEN_TEST;
  if (!token || process.env.MP_ENVIRONMENT !== 'test') return json(503, { error: 'O pagamento Pix de teste ainda não está configurado.' });
  let input; try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Pedido inválido.' }); }
  const clean = (v, max = 160) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const email = clean(input.email, 254), fullName = clean(input.fullName, 120), phone = clean(input.phone, 30);
  const cpf = clean(input.taxId, 20).replace(/\D/g, '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Informe um e-mail válido.' });
  if (fullName.split(/\s+/).filter(Boolean).length < 2 || !validCPF(cpf)) return json(400, { error: 'Informe nome completo e um CPF válido para gerar o Pix.' });
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 20) return json(400, { error: 'O carrinho está vazio ou contém itens demais.' });
  let subtotal = 0, count = 0; const items = [];
  for (const row of input.items) {
    const product = PRODUCTS[row?.name], quantity = Number(row?.quantity);
    if (!product || !product.colors.includes(row.color) || !product.sizes.includes(row.size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) return json(400, { error: 'Um produto do carrinho não é válido. Atualize a página e tente novamente.' });
    count += quantity; if (count > 30) return json(400, { error: 'O limite por pedido é de 30 unidades.' });
    subtotal += product.price * quantity;
    items.push({ name: row.name, color: row.color, size: row.size, quantity, unitPrice: product.price, lineTotal: Math.round(product.price * quantity * 100) / 100 });
  }
  const discount = Math.round(subtotal * 0.05 * 100) / 100;
  const amount = Math.round((subtotal - discount) * 100) / 100;
  const [firstName, ...lastParts] = fullName.split(/\s+/);
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '.000-03:00');
  const payment = {
    transaction_amount: amount,
    description: `HERBSTLAND - Pedido Pix (${items.map(x => `${x.quantity}x ${x.name}`).join('; ').slice(0, 180)})`,
    payment_method_id: 'pix',
    date_of_expiration: expiry,
    payer: { email, first_name: firstName, last_name: lastParts.join(' '), identification: { type: 'CPF', number: cpf }, phone: { area_code: phone.replace(/\D/g, '').slice(0, 2), number: phone.replace(/\D/g, '').slice(2) } },
    metadata: { store: 'HERBSTLAND', subtotal, pix_discount: discount, delivery_method: clean(input.delivery, 100), customer_name: fullName },
    external_reference: `herbstland-pix-${randomUUID()}`,
  };
  const diagnosticId = randomUUID();
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': randomUUID() }, body: JSON.stringify(payment) });
    let result = {}; try { result = await response.json(); } catch {}
    if (!response.ok) {
      console.error('HERBSTLAND_PIX_DIAGNOSTIC', JSON.stringify({ diagnosticId, httpStatus: response.status, apiError: String(result.error || '').slice(0, 100), apiMessage: String(result.message || '').slice(0, 240), causes: Array.isArray(result.cause) ? result.cause.slice(0, 5).map(x => ({ code: String(x.code || ''), description: String(x.description || '').slice(0, 180) })) : [] }));
      return json(502, { error: 'O Mercado Pago não conseguiu gerar o Pix. Confira o CPF e tente novamente.', diagnosticId });
    }
    const tx = result.point_of_interaction?.transaction_data;
    if (!tx?.qr_code || !tx?.qr_code_base64) return json(502, { error: 'O Mercado Pago não retornou o QR Code Pix. Tente novamente.', diagnosticId });
    return json(200, { paymentId: String(result.id), status: String(result.status || 'pending'), statusDetail: String(result.status_detail || ''), orderNumber: String(result.id), amount, subtotal, discount, items, qrCode: tx.qr_code, qrCodeBase64: tx.qr_code_base64, ticketUrl: tx.ticket_url || '', expiration: result.date_of_expiration || expiry, diagnosticId });
  } catch (error) {
    console.error('HERBSTLAND_PIX_DIAGNOSTIC', JSON.stringify({ diagnosticId, stage: 'network_or_runtime_error', message: String(error?.message || 'unknown').slice(0, 200) }));
    return json(502, { error: 'Não foi possível conectar ao Mercado Pago para gerar o Pix. Tente novamente.', diagnosticId });
  }
};
