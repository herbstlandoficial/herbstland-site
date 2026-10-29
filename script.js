const products={
 friends:{name:'CAMISETA OVERSIZED FRIENDS',price:49.90,description:'Se você é fã de Friends e ama aquele estilo descontraído e cheio de personalidade, essa camiseta foi feita para você! Estampa frontal inspirada na identidade clássica da série, com bolinhas coloridas entre as letras. Modelo oversized, visual minimalista e estiloso, ideal para o dia a dia e para combinar com os amigos.',image:'assets/friends-oversized.png',images:{'Branco':'assets/friends-oversized.png','Preto':'assets/friends-oversized-preta.png'},gallery:['assets/friends-oversized.png','assets/friends-oversized-preta.png','assets/friends-modelo.png','assets/friends-guia-tamanhos.png'],colors:['Branco','Preto'],sizes:['M','G']},
 peanuts:{name:'CAMISETA OVERSIZED PEANUTS SNOOPY CHARLIE BROWN',price:54.90,description:'Para quem ama personagens clássicos e não abre mão de um visual moderno! Camiseta oversized Peanuts com Snoopy, Charlie Brown e seus amigos. Modelagem ampla e moderna, gola redonda, manga curta e composição 100% algodão.',image:'assets/peanuts-oversized.png',gallery:['assets/peanuts-oversized.png','assets/peanuts-modelo.png','assets/peanuts-guia-tamanhos.png'],colors:['Preto'],sizes:['M','G']},
 surtar:{name:'CAMISETA QUERIA SURTAR MAS TÔ SEM TEMPO',price:54.90,description:'Se você também vive na correria e às vezes só queria surtar, essa camiseta foi feita para você! Frase divertida e cheia de personalidade, com estampa preta em camiseta branca. Ideal para looks casuais e descontraídos.',image:'assets/queria-surtar-oversized.png',gallery:['assets/queria-surtar-oversized.png','assets/surtar-modelo.png','assets/surtar-guia-tamanhos.png'],colors:['Branco'],sizes:['M','G']}
};
let cart=[];let selectedProduct='friends';let selectedColor='';
const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);const money=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const overlay=$('#overlay'),drawer=$('#cart-drawer'),modal=$('#quick-modal');const mobileMenu=$('#mobile-menu');if(mobileMenu)mobileMenu.classList.remove('open');
function showOverlay(){overlay.classList.add('open')}function hideOverlay(){overlay.classList.remove('open');drawer.classList.remove('open');modal.classList.remove('open');mobileMenu.classList.remove('open');drawer.setAttribute('aria-hidden','true');modal.setAttribute('aria-hidden','true')}
function openCart(){showOverlay();drawer.classList.add('open');drawer.setAttribute('aria-hidden','false')}
function setGalleryImage(src,alt){const main=$('#gallery-main');if(main){main.src=src;main.alt=alt;}$$('.gallery-thumb').forEach(b=>b.classList.toggle('active',b.dataset.image===src))}
function openModal(id){selectedProduct=id;const p=products[id];$('#modal-title').textContent=p.name;$('#modal-description').textContent=p.description;$('#modal-price').textContent=money(p.price);$('#modal-visual').className='modal-visual modal-product-photo';const gallery=p.gallery||[p.image];$('#modal-visual').innerHTML=`<div class="gallery-stage"><img id="gallery-main" src="${gallery[0]}" alt="${p.name}"></div><div class="gallery-thumbs" aria-label="Mais fotos do produto">${gallery.map((src,i)=>`<button type="button" class="gallery-thumb ${i===0?'active':''}" data-image="${src}" aria-label="Ver foto ${i+1}"><img src="${src}" alt=""></button>`).join('')}</div>`;$$('.gallery-thumb').forEach(b=>b.addEventListener('click',()=>setGalleryImage(b.dataset.image,p.name)));const colors=$('#color-select');colors.innerHTML=p.colors.map(c=>`<option value="${c}">${c}</option>`).join('');selectedColor=p.colors[0];colors.onchange=()=>{selectedColor=colors.value;const chosenImage=p.images?.[selectedColor];if(chosenImage)setGalleryImage(chosenImage,p.name);};const sizes=$('#size-select');sizes.innerHTML=p.sizes.map(s=>`<option value="${s}">${s}</option>`).join('');showOverlay();modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
$$('[data-quick]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.quick)));
try{cart=JSON.parse(localStorage.getItem('herbstland-cart')||'[]')}catch(e){cart=[]}$('.close-drawer').addEventListener('click',hideOverlay);$('.modal-close').addEventListener('click',hideOverlay);overlay.addEventListener('click',hideOverlay);
$('#add-to-cart').addEventListener('click',()=>{const p=products[selectedProduct];cart.push({name:p.name,price:money(p.price),color:selectedColor,size:$('#size-select').value,quantity:1,image:p.image});localStorage.setItem('herbstland-cart',JSON.stringify(cart));renderCart();hideOverlay();window.location.href='carrinho.html'});
function renderCart(){localStorage.setItem('herbstland-cart',JSON.stringify(cart));const count=cart.reduce((n,p)=>n+(Number(p.quantity)||1),0);$('#cart-count').textContent=count;$('#drawer-count').textContent=`(${count})`;const total=cart.reduce((s,p)=>s+(Number(p.price)||Number(String(p.price||'0').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.'))||0)*(Number(p.quantity)||1),0);$('#cart-total').textContent=money(total);const hv=$('#header-cart-value');if(hv)hv.textContent=money(total);$('#cart-items').innerHTML=count?cart.map((p,i)=>`<div class="cart-line"><div><b>${p.name}</b><small>${p.color} · Tamanho ${p.size} · ${money(p.price)}</small></div><button data-remove="${i}">REMOVER</button></div>`).join(''):'<p class="empty-cart">Sua sacola está vazia.<br>O próximo passo é seu.</p>';$('#checkout-button').disabled=!count;$$('[data-remove]').forEach(b=>b.addEventListener('click',()=>{cart.splice(Number(b.dataset.remove),1);renderCart()}))}
renderCart();
$('#checkout-button').addEventListener('click',()=>alert('A integração segura com o Mercado Pago será configurada na próxima etapa. Nenhuma cobrança é realizada nesta demonstração.'));
function applyFilter(f){$$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter===f));$$('.product-card').forEach(card=>card.style.display=f==='all'||card.dataset.category===f?'':'none')}
$$('[data-header-filter]').forEach(link=>link.addEventListener('click',()=>{const f=link.dataset.headerFilter;setTimeout(()=>applyFilter(f),80)}));$$('.filter').forEach(b=>b.addEventListener('click',()=>applyFilter(b.dataset.filter)));$$('[data-filter].collection-card').forEach(card=>card.addEventListener('click',()=>{const f=card.dataset.filter;applyFilter(f)}));
$('.menu-toggle').addEventListener('click',()=>{mobileMenu.classList.add('open');showOverlay()});$('.mobile-menu-close').addEventListener('click',hideOverlay);$$('.mobile-menu a').forEach(a=>a.addEventListener('click',hideOverlay));const newsletterForm=$('#newsletter-form');if(newsletterForm)newsletterForm.addEventListener('submit',e=>{e.preventDefault();$('#newsletter-feedback').textContent='VALEU! O CADASTRO SERÁ CONECTADO NA PRÓXIMA ETAPA.';$('#email').value=''});document.addEventListener('keydown',e=>{if(e.key==='Escape')hideOverlay()});
const intro=document.getElementById('brand-intro');function finishIntro(){if(!intro)return;intro.classList.add('is-hidden');intro.remove()}if(intro){intro.addEventListener('animationend',e=>{if(e.target===intro)finishIntro()},{once:true});window.setTimeout(finishIntro,5200)}
const art=$('.hero-art');window.addEventListener('pointermove',e=>{if(window.innerWidth>850&&art){const x=(e.clientX/window.innerWidth-.5)*8;const y=(e.clientY/window.innerHeight-.5)*8;art.style.transform=`rotate(${2+x*.12}deg) translate(${x}px,${y}px)`}});

// Avaliações em carrossel: três cartões por página, com navegação lateral.
(()=>{
 const form=document.getElementById('review-form'); if(!form)return;
 const list=document.getElementById('reviews-list');
 const feedback=document.getElementById('review-feedback');
 const ratingInput=document.getElementById('review-rating');
 const ratingButtons=[...form.querySelectorAll('[data-rating]')];
 const prev=document.querySelector('.reviews-prev'), next=document.querySelector('.reviews-next');
 const pageLabel=document.querySelector('.reviews-page-label'), dots=document.querySelector('.reviews-dots');
 let rating=5, reviews=[], page=0;
 const perPage=()=>window.matchMedia('(max-width:560px)').matches?1:(window.matchMedia('(max-width:850px)').matches?2:3);
 function paintRating(){ratingButtons.forEach(b=>{const active=Number(b.dataset.rating)<=rating;b.classList.toggle('active',active);b.setAttribute('aria-checked',String(Number(b.dataset.rating)===rating));});ratingInput.value=rating;}
 ratingButtons.forEach(b=>b.addEventListener('click',()=>{rating=Number(b.dataset.rating);paintRating();}));
 function cardFor(review){
   const card=document.createElement('article');card.className='review-card';
   const head=document.createElement('div');head.className='review-card-head';
   const name=document.createElement('strong');name.textContent=review.name;
   const role=document.createElement('span');role.textContent='Cliente HERBSTLAND';head.append(name,role);
   const divider=document.createElement('div');divider.className='review-card-divider';
   const stars=document.createElement('div');stars.className='review-card-stars';stars.setAttribute('aria-label',review.rating+' de 5 estrelas');
   const starText=document.createElement('span');starText.textContent='★'.repeat(review.rating)+'☆'.repeat(5-review.rating);
   const score=document.createElement('small');score.textContent=review.rating+'/5';stars.append(starText,score);
   const message=document.createElement('p');message.className='review-card-message';message.textContent=review.message;
   const date=document.createElement('small');date.className='review-card-date';date.textContent=review.date||'Recentemente';
   card.append(head,divider,stars,message,date);return card;
 }
 function render(){
   list.innerHTML='';
   if(!reviews.length){list.innerHTML='<div class="reviews-placeholder"><span>★★★★★</span><h4>Sua opinião pode aparecer aqui.</h4><p>Seja a primeira pessoa a avaliar sua experiência com a HERBSTLAND.</p></div>';prev.disabled=next.disabled=true;pageLabel.textContent='1 / 1';dots.innerHTML='';return;}
   const size=perPage(),pages=Math.max(1,Math.ceil(reviews.length/size));page=Math.min(page,pages-1);
   reviews.slice(page*size,(page+1)*size).forEach(r=>list.append(cardFor(r)));
   prev.disabled=page===0;next.disabled=page>=pages-1;
   pageLabel.textContent=(page+1)+' / '+pages;
   dots.innerHTML='';for(let i=0;i<pages;i++){const dot=document.createElement('button');dot.type='button';dot.className='reviews-dot'+(i===page?' active':'');dot.setAttribute('aria-label','Ir para página '+(i+1));dot.addEventListener('click',()=>{page=i;render()});dots.append(dot);}
 }
 try{reviews=JSON.parse(localStorage.getItem('herbstland-reviews')||'[]');if(!Array.isArray(reviews))reviews=[];}catch(e){reviews=[];}
 prev.addEventListener('click',()=>{if(page>0){page--;render()}});next.addEventListener('click',()=>{if(page<Math.ceil(reviews.length/perPage())-1){page++;render()}});
 window.addEventListener('resize',()=>{const max=Math.max(0,Math.ceil(reviews.length/perPage())-1);page=Math.min(page,max);render()});
 form.addEventListener('submit',e=>{e.preventDefault();const review={name:document.getElementById('review-name').value.trim(),rating,message:document.getElementById('review-message').value.trim(),date:'Agora'};if(!review.name||!review.message)return;reviews.unshift(review);page=0;try{localStorage.setItem('herbstland-reviews',JSON.stringify(reviews));feedback.textContent='Obrigado! Sua avaliação ficou registrada neste navegador.';}catch(e){feedback.textContent='Obrigado por compartilhar sua opinião!';}render();form.reset();rating=5;paintRating();});
 paintRating();render();
})();
