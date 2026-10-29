(() => {
  const cfg = window.HERBSTLAND_SUPABASE_CONFIG;
  const $ = (id) => document.getElementById(id);
  if (!cfg || !window.supabase) {
    document.body.classList.remove('auth-pending');
    const box = $('account-message');
    if (box) { box.textContent = 'Não foi possível carregar o serviço de conta. Verifique sua conexão e recarregue a página.'; box.className = 'account-message show error'; }
    return;
  }
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  const authPanel = $('auth-panel'), dashboard = $('account-dashboard'), loginForm = $('login-form'), signupForm = $('signup-form');
  const messageBox = $('account-message');
  const setMessage = (message, type='success') => { messageBox.textContent = message; messageBox.className = `account-message show ${type}`; };
  const clearMessage = () => { messageBox.textContent = ''; messageBox.className = 'account-message'; };
  const busy = (form, state) => { const button = form.querySelector('button[type="submit"]'); button.disabled = state; button.textContent = state ? 'AGUARDE...' : (form.id === 'login-form' ? 'ENTRAR NA MINHA CONTA ↗' : 'CRIAR MINHA CONTA ↗'); };
  let currentUser = null, editingAddressId = null;
  function showMode(mode) {
    clearMessage(); loginForm.hidden = mode !== 'login'; signupForm.hidden = mode !== 'signup';
    $('tab-login').classList.toggle('active', mode === 'login'); $('tab-signup').classList.toggle('active', mode === 'signup');
  }
  function showDashboard(user) {
    if (!user) return;
    const sameUser = currentUser?.id === user.id && dashboard.classList.contains('visible');
    currentUser = user;
    authPanel.style.display = 'none'; dashboard.classList.add('visible');
    document.body.classList.remove('auth-pending');
    if (sameUser) return;
    $('dashboard-title').textContent = `Olá, ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'cliente'}!`;
    $('dashboard-email').textContent = user.email || '';
    loadAddresses();
  }
  $('tab-login').onclick = () => showMode('login'); $('tab-signup').onclick = () => showMode('signup');
  $('show-signup').onclick = () => showMode('signup'); $('show-login').onclick = () => showMode('login');
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); clearMessage(); busy(loginForm, true);
    const { data, error } = await client.auth.signInWithPassword({ email: $('login-email').value.trim(), password: $('login-password').value });
    busy(loginForm, false);
    if (error) return setMessage(error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos. Confira os dados e tente novamente.' : error.message, 'error');
    showDashboard(data.user);
  });
  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault(); clearMessage();
    const password = $('signup-password').value;
    if (password !== $('signup-confirm').value) return setMessage('As senhas não conferem. Digite novamente.', 'error');
    busy(signupForm, true);
    const { data, error } = await client.auth.signUp({
      email: $('signup-email').value.trim(), password,
      options: { data: { full_name: $('signup-name').value.trim(), phone: $('signup-phone').value.trim() }, emailRedirectTo: `${window.location.origin}${window.location.pathname}` }
    });
    busy(signupForm, false);
    if (error) return setMessage(error.message, 'error');
    if (data.session && data.user) showDashboard(data.user);
    else setMessage('Cadastro iniciado! Enviamos um e-mail de confirmação. Abra sua caixa de entrada (e o spam, se necessário) e confirme o endereço para liberar seu acesso. Depois, volte aqui para entrar.', 'success');
  });
  $('forgot-password').onclick = async () => {
    clearMessage(); const email = $('login-email').value.trim();
    if (!email) return setMessage('Digite seu e-mail no campo acima e clique novamente em “Esqueci minha senha”.', 'error');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}?redefinir=1` });
    if (error) return setMessage(error.message, 'error');
    setMessage('Se esse e-mail estiver cadastrado, você receberá uma mensagem com as instruções para redefinir sua senha.', 'success');
  };

  // Endereços: as políticas RLS limitam leitura e alterações ao usuário autenticado.
  const addressForm = $('address-form'), addressList = $('address-list'), addressFeedback = $('address-feedback');
  const addressFields = ['label','recipient','phone','postal_code','street','number','complement','neighborhood','city','state'];
  const addressInputIds = {label:'address-label',recipient:'address-recipient',phone:'address-phone',postal_code:'address-postal',street:'address-street',number:'address-number',complement:'address-complement',neighborhood:'address-neighborhood',city:'address-city',state:'address-state'};
  function addressNotice(message, type='success') { addressFeedback.textContent = message; addressFeedback.className = `address-feedback show ${type}`; }
  function closeAddressForm() { addressForm.classList.remove('open'); addressForm.reset(); editingAddressId = null; $('address-form-title').textContent = 'Novo endereço'; $('address-save').textContent = 'SALVAR ENDEREÇO'; }
  function openAddressForm(row=null) {
    addressForm.reset(); editingAddressId = row?.id || null;
    $('address-form-title').textContent = row ? 'Editar endereço' : 'Novo endereço';
    $('address-save').textContent = row ? 'SALVAR ALTERAÇÕES' : 'SALVAR ENDEREÇO';
    if (row) addressFields.forEach((field) => { $(addressInputIds[field]).value = row[field] || ''; });
    addressForm.classList.add('open');
    addressForm.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function loadAddresses() {
    if (!currentUser) return;
    addressList.innerHTML = '<div class="address-empty">Carregando seus endereços...</div>';
    const { data, error } = await client.from('addresses').select('id,user_id,label,recipient,phone,postal_code,street,number,complement,neighborhood,city,state,created_at').eq('user_id', currentUser.id).order('created_at', {ascending:false});
    if (error) { addressList.innerHTML = '<div class="address-empty">Não foi possível carregar os endereços. Confira as políticas de acesso da tabela no Supabase e tente novamente.</div>'; addressNotice(`Erro ao carregar: ${error.message}`, 'error'); return; }
    addressFeedback.className = 'address-feedback';
    if (!data?.length) { addressList.innerHTML = '<div class="address-empty">Você ainda não cadastrou nenhum endereço. Clique em “Adicionar endereço” para incluir o primeiro.</div>'; return; }
    addressList.innerHTML = data.map((row) => {
      const locality = [row.neighborhood,row.city,row.state].filter(Boolean).join(' · ');
      const complement = row.complement ? `, ${escapeHtml(row.complement)}` : '';
      return `<article class="address-item"><div class="address-item-top"><span class="address-label">${escapeHtml(row.label || 'Endereço')}</span><div class="address-controls"><button type="button" data-edit-address="${escapeHtml(row.id)}">EDITAR</button><button type="button" data-delete-address="${escapeHtml(row.id)}">EXCLUIR</button></div></div><p class="address-details"><strong>${escapeHtml(row.recipient)}</strong>${row.phone ? ` · ${escapeHtml(row.phone)}` : ''}<br>${escapeHtml(row.street)}, ${escapeHtml(row.number)}${complement}<br>${locality ? `${escapeHtml(locality)} · ` : ''}${escapeHtml(row.postal_code)}</p></article>`;
    }).join('');
    addressList.querySelectorAll('[data-edit-address]').forEach((button) => button.addEventListener('click', () => {
      const row = data.find((item) => item.id === button.dataset.editAddress); if (row) openAddressForm(row);
    }));
    addressList.querySelectorAll('[data-delete-address]').forEach((button) => button.addEventListener('click', async () => {
      const row = data.find((item) => item.id === button.dataset.deleteAddress); if (!row) return;
      if (!window.confirm(`Deseja excluir o endereço “${row.label || 'Endereço'}”?`)) return;
      button.disabled = true;
      const { error: deleteError } = await client.from('addresses').delete().eq('id', row.id).eq('user_id', currentUser.id);
      if (deleteError) { button.disabled = false; addressNotice(`Não foi possível excluir: ${deleteError.message}`, 'error'); return; }
      addressNotice('Endereço excluído com sucesso.'); await loadAddresses();
    }));
  }
  $('add-address').addEventListener('click', () => openAddressForm());
  $('address-cancel').addEventListener('click', closeAddressForm);
  $('address-postal').addEventListener('input', (event) => {
    let value = event.target.value.replace(/\D/g,'').slice(0,8); if (value.length > 5) value = `${value.slice(0,5)}-${value.slice(5)}`; event.target.value = value;
  });
  $('address-state').addEventListener('input', (event) => { event.target.value = event.target.value.replace(/[^a-z]/gi,'').slice(0,2).toUpperCase(); });
  addressForm.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!currentUser) return addressNotice('Sua sessão expirou. Entre novamente para salvar o endereço.', 'error');
    const payload = {user_id:currentUser.id};
    addressFields.forEach((field) => { payload[field] = $(addressInputIds[field]).value.trim(); });
    payload.postal_code = payload.postal_code.replace(/\D/g,''); payload.state = payload.state.toUpperCase();
    if (payload.postal_code.length !== 8) return addressNotice('Informe um CEP válido com 8 números.', 'error');
    const wasEditing = Boolean(editingAddressId);
    const saveButton = $('address-save'); saveButton.disabled = true; saveButton.textContent = 'SALVANDO...';
    let result;
    if (wasEditing) result = await client.from('addresses').update(payload).eq('id', editingAddressId).eq('user_id', currentUser.id);
    else result = await client.from('addresses').insert(payload);
    saveButton.disabled = false; saveButton.textContent = wasEditing ? 'SALVAR ALTERAÇÕES' : 'SALVAR ENDEREÇO';
    if (result.error) { addressNotice(`Não foi possível salvar o endereço: ${result.error.message}`, 'error'); return; }
    closeAddressForm(); addressNotice(wasEditing ? 'Endereço atualizado com sucesso!' : 'Endereço cadastrado com sucesso!'); await loadAddresses();
  });
  $('logout-button').onclick = async () => {
    const { error } = await client.auth.signOut();
    if (error) { setMessage('Não foi possível sair da conta agora. Tente novamente.', 'error'); return; }
    currentUser = null; dashboard.classList.remove('visible'); authPanel.style.display = '';
    document.body.classList.remove('auth-pending'); closeAddressForm(); showMode('login');
    setMessage('Você saiu da sua conta. Até a próxima!', 'success');
  };

  // Primeiro confirma a sessão e só então revela a tela correta: login/cadastro ou painel.
  // Isso evita o formulário aparecer por um instante e desaparecer durante a atualização.
  let authResolved = false;
  const finishAuthCheck = (session) => {
    if (session?.user) showDashboard(session.user);
    else {
      currentUser = null; dashboard.classList.remove('visible'); authPanel.style.display = '';
      document.body.classList.remove('auth-pending');
    }
    authResolved = true;
  };
  client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) finishAuthCheck(session);
    else if (authResolved) finishAuthCheck(null);
  });
  client.auth.getSession().then(({ data, error }) => {
    if (error) finishAuthCheck(null);
    else finishAuthCheck(data?.session || null);
  }).catch(() => finishAuthCheck(null));
})();
