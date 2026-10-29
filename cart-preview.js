(()=>{
  // Inicialização única: evita dois controladores disputando a mesma sacola.
  if (window.__HERBSTLAND_CART_PREVIEW_INITIALIZED__) return;
  window.__HERBSTLAND_CART_PREVIEW_INITIALIZED__ = true;
  const KEY='herbstland-cart';
  const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const parsePrice=v=>typeof v==='number'?v:(Number(String(v||'0').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
  const imageFor=p=>{if(p.image)return p.image;const n=(p.name||'').toLowerCase();if(n.includes('friends'))return'assets/friends-oversized.png';if(n.includes('snoopy')||n.includes('peanuts'))return'assets/peanuts-oversized.png';if(n.includes('surtar'))return'assets/queria-surtar-oversized.png';if(n.includes('caneca'))return'assets/atalho-caneca-ceramica.jpg';return'assets/herbstland-logo.png'};
  const cartIcon='<svg class="cart-svg" viewBox="0 0 48 48" role="img" aria-label="Carrinho de compras" xmlns="http://www.w3.org/2000/svg"><path d="M3 5h5l4.5 7.5 5.1 21.2a3.4 3.4 0 0 0 3.3 2.6h17.5" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 13h32l-4.7 18.2H17.2M16 19h26M17.5 25h22M23 14l2 16M33 14l-1 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="21" cy="40" r="3.1" fill="currentColor"/><circle cx="37" cy="40" r="3.1" fill="currentColor"/></svg>';
  document.querySelectorAll('.cart-trigger').forEach(a=>{a.innerHTML=cartIcon+'<span class="bag-count" id="cart-count">0</span><span class="cart-value" id="header-cart-value">R$ 0,00</span>';a.setAttribute('href','carrinho.html');a.setAttribute('aria-label','Abrir carrinho')});
  let drawer=document.getElementById('cart-drawer');
  if(!drawer){drawer=document.createElement('aside');drawer.id='cart-drawer';drawer.className='cart-drawer cart-preview-drawer';drawer.setAttribute('aria-label','Resumo do carrinho');drawer.setAttribute('aria-hidden','true');document.body.appendChild(drawer)}
  drawer.classList.add('cart-preview-drawer');
  // A sacola começa sempre fechada; só abre após clique explícito no ícone.
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  let scrim=document.querySelector('.cart-preview-scrim');if(!scrim){scrim=document.createElement('div');scrim.className='cart-preview-scrim';document.body.appendChild(scrim)}
  scrim.classList.remove('open');
  const header=document.querySelector('.site-header');
  // Desktop: posiciona o resumo logo abaixo do ícone do carrinho, não abaixo de todo o cabeçalho.
  // Mobile mantém o posicionamento anterior para não alterar a versão já aprovada.
  const updateTop=()=>{
    if(window.matchMedia('(min-width: 761px)').matches){
      const trigger=document.querySelector('.cart-trigger');
      if(trigger){
        const rect=trigger.getBoundingClientRect();
        const right=Math.max(12,Math.round(window.innerWidth-rect.right));
        drawer.style.setProperty('right',right+'px','important');
        drawer.style.setProperty('--cart-preview-top',Math.max(8,Math.round(rect.bottom+8))+'px');
        return;
      }
    }
    drawer.style.removeProperty('right');
    const bottom=header?header.getBoundingClientRect().bottom:78;
    drawer.style.setProperty('--cart-preview-top',Math.max(8,Math.round(bottom+5))+'px');
  };
  const count=items=>items.reduce((n,p)=>n+(Number(p.quantity)||1),0),total=items=>items.reduce((n,p)=>n+parsePrice(p.price)*(Number(p.quantity)||1),0);
  function render(){const items=load(),n=count(items),sum=total(items);document.querySelectorAll('#cart-count').forEach(el=>el.textContent=n);document.querySelectorAll('#header-cart-value').forEach(el=>el.textContent=money(sum));
    drawer.innerHTML='<div class="cart-preview-head"><button class="cart-preview-close" type="button" aria-label="Fechar carrinho">×</button></div>'+
      '<div class="cart-preview-list">'+(items.length?items.map((p,i)=>'<article class="cart-preview-item"><img class="cart-preview-thumb" src="'+esc(imageFor(p))+'" alt=""><div class="cart-preview-info"><strong class="cart-preview-name">'+esc(p.name||'Produto HERBSTLAND')+'</strong><span class="cart-preview-price">'+money(parsePrice(p.price))+'</span><small class="cart-preview-qty">'+(Number(p.quantity)||1)+' × '+money(parsePrice(p.price))+'</small></div><button class="cart-preview-remove" type="button" data-preview-remove="'+i+'" aria-label="Remover produto">−</button></article>').join(''):'<div class="cart-preview-empty">Seu carrinho está vazio.<br>Encontre sua próxima peça HERBSTLAND.</div>')+'</div>'+
      '<div class="cart-preview-subtotal">Subtotal: <strong>'+money(sum)+'</strong></div>'+
      '<div class="cart-preview-actions"><a class="cart-preview-btn cart-preview-view" href="carrinho.html">Ver carrinho</a><a class="cart-preview-btn cart-preview-checkout" href="checkout.html">Finalização de compra</a></div>';
    drawer.querySelector('.cart-preview-close').addEventListener('click',close);
    drawer.querySelectorAll('[data-preview-remove]').forEach(b=>b.addEventListener('click',()=>{const a=load();a.splice(Number(b.dataset.previewRemove),1);localStorage.setItem(KEY,JSON.stringify(a));render()}));
  }
  function open(){updateTop();render();drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');scrim.classList.add('open')}
  function close(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');scrim.classList.remove('open')}
  document.addEventListener('click',e=>{const trigger=e.target.closest('.cart-trigger');if(trigger){e.preventDefault();e.stopImmediatePropagation();open();return}if(e.target.closest('.cart-preview-drawer'))return;if(scrim.classList.contains('open'))close()},true);
  scrim.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('storage',e=>{if(e.key===KEY){render();if(drawer.classList.contains('open'))open()}});
  window.addEventListener('pageshow',render);window.addEventListener('resize',()=>{if(drawer.classList.contains('open'))updateTop()});
  render();
})();
