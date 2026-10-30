# Mercado Pago Checkout Pro — teste

## Netlify

1. Abra o site HERBSTLAND no painel da Netlify.
2. Vá a **Site configuration → Environment variables**.
3. Adicione `MP_ACCESS_TOKEN_TEST` com o Access Token da seção **Credenciais de teste** do Mercado Pago Developers. Cole o segredo diretamente na Netlify; não o envie por mensagem nem o coloque no GitHub.
4. Adicione `MP_ENVIRONMENT` com o valor `test`.
5. Salve e faça um novo deploy do branch conectado ao GitHub.

A função só cria checkout quando essas duas variáveis e a URL HTTPS do site estão disponíveis. Ela exige que o Mercado Pago retorne `sandbox_init_point` e recusa qualquer URL que não seja do host sandbox. Não configure um token de produção.

## Como testar

Use uma conta compradora de teste e os dados de pagamento de teste fornecidos no painel do Mercado Pago. Escolha PIX ou cartão no checkout da loja. A preferência é criada no servidor, com preços e variantes conferidos contra o catálogo; o token não é enviado ao navegador. Nome, telefone e endereço informados no checkout são enviados ao Mercado Pago como dados do pagador e metadados da preferência para ajudar a identificar a entrega. Isso não substitui um sistema próprio de pedidos nem confirma o frete. O frete segue a confirmar com a HERBSTLAND e não está incluído no pagamento.

A opção “Quero combinar com o atendimento” continua encaminhando o resumo pelo WhatsApp. Os modelos de caneca ainda não estão habilitados para checkout online porque o site não apresenta preço nem formulário de compra para eles.

## Se o PIX não aparecer

A preferência agora envia `default_payment_method_id: "pix"` e não exclui outras formas de pagamento. Isso pede ao Mercado Pago que destaque o PIX, mas a conta do vendedor ainda precisa estar habilitada para recebê-lo; o Mercado Pago informa que o PIX só aparece quando há uma chave PIX cadastrada na conta. Confira a chave na conta Mercado Pago que recebe as vendas. Para validar sem cobrança real, use o ambiente de teste e a conta compradora de teste; pagamentos offline de teste ficam pendentes.
