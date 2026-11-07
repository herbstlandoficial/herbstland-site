(()=>{
  const form=document.getElementById('site-search-form');
  const input=document.getElementById('site-search');
  const panel=document.getElementById('search-feedback');
  if(!form||!input||!panel)return;
  const products=[
    {name:'CAMISETA OVERSIZED FRIENDS',price:'R$ 49,90',image:'assets/friends-oversized.png',url:'camiseta-friends.html',terms:'friends camiseta oversized amigos'},
    {name:'CAMISETA OVERSIZED PEANUTS SNOOPY CHARLIE BROWN',price:'R$ 54,90',image:'assets/peanuts-oversized.png',url:'camiseta-peanuts-snoopy.html',terms:'peanuts snoopy charlie brown camiseta'},
    {name:'CAMISETA QUERIA SURTAR MAS TÔ SEM TEMPO',price:'R$ 54,90',image:'assets/queria-surtar-oversized.png',url:'camiseta-queria-surtar.html',terms:'queria surtar sem tempo camiseta'},
    {name:'CANECAS PERSONALIZADAS',price:'Confira os modelos',image:'assets/atalho-caneca-ceramica.jpg',url:'canecas.html',terms:'caneca canecas personalizada personalizar'}
  ];
  const normalize=v=>(v||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const link=(label,href,cls='')=>{const a=document.createElement('a');a.href=href;a.textContent=label;if(cls)a.className=cls;return a;};
  const close=()=>{panel.hidden=true;panel.replaceChildren();};
  const render=()=>{
    const q=normalize(input.value);panel.replaceChildren();if(!q){close();return;}
    const left=document.createElement('section');left.className='search-panel-categories';
    const catTitle=document.createElement('small');catTitle.textContent='CATEGORIAS';left.append(catTitle);
    const cats=[['Camisetas oversized','camisetas-oversized.html','camiseta oversized friends peanuts'],['Canecas','canecas.html','caneca canecas'],['Todos os produtos','index.html#mais-vendidos','produto produtos loja']];
    const relevant=cats.filter(c=>normalize(c[0]+' '+c[2]).includes(q)||q.split(' ').some(w=>w.length>2&&normalize(c[0]+' '+c[2]).includes(w)));
    (relevant.length?relevant:[cats[2]]).forEach(c=>left.append(link(c[0],c[1])));
    const right=document.createElement('section');right.className='search-panel-products';const title=document.createElement('div');title.className='search-panel-title';title.textContent='PRODUTOS';right.append(title);
    const matches=products.filter(p=>normalize(p.name+' '+p.terms).includes(q)||q.split(' ').some(w=>w.length>2&&normalize(p.name+' '+p.terms).includes(w)));
    if(matches.length){matches.forEach(p=>{const a=link('',p.url,'search-result');const img=document.createElement('img');img.src=p.image;img.alt='';const copy=document.createElement('span');copy.className='search-result-copy';const name=document.createElement('strong');name.textContent=p.name;const price=document.createElement('small');price.textContent=p.price;copy.append(name,price);const arrow=document.createElement('span');arrow.className='search-result-arrow';arrow.textContent='↗';a.append(img,copy,arrow);right.append(a);});}
    else{const empty=document.createElement('p');empty.className='search-empty';empty.textContent='Nenhum produto encontrado. Tente “Friends”, “Snoopy” ou “caneca”.';right.append(empty);}
    panel.append(left,right);panel.hidden=false;
  };
  input.addEventListener('input',render);
  form.addEventListener('submit',e=>{e.preventDefault();render();if(!normalize(input.value))input.focus();});
  input.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  document.addEventListener('click',e=>{if(!form.contains(e.target))close();});
  const params=new URLSearchParams(location.search);const initial=params.get('q');if(initial){input.value=initial;render();}
})();
