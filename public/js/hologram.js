/* BOB holographic shell. Existing cards retain their data, voice and action handlers. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = {whatsapp:'◉',outlook:'O',mail:'✉',google:'G',agenda:'31',todoist:'≋',tasks:'✓',memory:'☷',web:'◉',summary:'▤',write:'✎',search:'⌕',translate:'文',linkedin:'in',instagram:'◎',facebook:'f',tiktok:'♪',photos:'✣',drive:'▲'};
const artworkIcons={whatsapp:[124,206,49,49],outlook:[239,214,45,44],mail:[346,217,46,45],gmail:[1200,217,37,34],google:[1113,214,40,42],agenda:[104,455,41,42],todoist:[204,451,45,45],tasks:[301,451,45,45],memory:[397,449,35,45],drive:[1373,204,39,43],photos:[1458,201,40,43],linkedin:[624,772,40,40],instagram:[727,771,40,41],facebook:[828,771,41,41],tiktok:[927,770,42,43],web:[1117,448,47,48]};
const glyph = (id) => artworkIcons[id] ? `<svg class="service-icon artwork-icon" viewBox="${artworkIcons[id].join(' ')}" aria-hidden="true"><image href="/assets/reference/home.jpeg" width="1600" height="900"/></svg>` : `<span class="service-icon i-${id}" aria-hidden="true">${icons[id] || '✦'}</span>`;
const tile = (id,name,href) => `<a class="h-tile" href="#${href || id}">${glyph(id)}<span>${name}</span></a>`;
const panel = (title,sub,icon,tiles,cls,href) => `<section class="home-panel glass ${cls}"><a class="home-panel-title" href="#${href}"><span class="round-icon">${icon}</span><span><strong>${title}</strong><small>${sub}</small></span><span class="chevron">›</span></a><div class="home-tiles">${tiles}</div></section>`;
document.body.classList.add('holographic');
document.documentElement.dataset.theme = 'light';
const legacy = $('.shell');
legacy.classList.add('legacy-store');
const stage = document.createElement('main');
stage.id = 'holoStage';
stage.innerHTML = `
  <div class="atmosphere" aria-hidden="true"></div><canvas id="particles" aria-hidden="true"></canvas>
  <div id="homeScene" class="home-scene">
    <h1 class="sr-only">Bob — jouw slimme assistent</h1>
    ${panel('Communicatie','Altijd in contact','☏',tile('whatsapp','WhatsApp')+tile('outlook','Outlook')+tile('mail','Mail'),'home-communication','mail')}
    ${panel('Planning & Productiviteit','Meer gedaan, minder gedoe','▦',tile('agenda','Agenda')+tile('todoist','Todoist')+tile('tasks','Taken','opdrachten')+tile('memory','Herinneringen','geheugen'),'home-planning','agenda')}
    ${panel('Google Workspace','Alles van Google op één plek','G',tile('google','Google')+tile('gmail','Gmail','mail')+tile('agenda','Calendar')+tile('drive','Drive','bestanden')+tile('photos',"Foto’s"),'home-google','google')}
    ${panel('Web Assistent','Slimmer surfen, sneller resultaat','✦',tile('web','Web Assistent')+tile('summary','Samenvatten','web')+tile('write','Schrijven','web')+tile('search','Onderzoeken','web')+tile('translate','Vertalen','web'),'home-web','web')}
    ${panel('Social Media','Blijf verbonden','♟',tile('linkedin','LinkedIn','social')+tile('instagram','Instagram','social')+tile('facebook','Facebook','social')+tile('tiktok','TikTok','social'),'home-social','social')}
    <button class="head-touch" aria-label="Praat met Bob" title="Open een gesprek met Bob"></button>
    <span class="thought t-one">Analyseren</span><span class="thought t-two">Verbinden</span><span class="thought t-three">Begrijpen</span><span class="thought t-four">Creëren</span><span class="thought t-five">Vooruitdenken</span>
  </div>
  <div id="workspaceScene" hidden>
    <nav class="holo-nav" aria-label="Omgevingen">${[['vandaag','⌂','Start'],['whatsapp','◉','WhatsApp'],['outlook','O','Outlook'],['mail','✉','Mail'],['google','G','Google'],['agenda','▦','Planning'],['social','◎','Social'],['web','⌕','Web'],['opdrachten','✓','Opdrachten'],['geheugen','☷','Geheugen']].map(([id,i,t])=>`<a href="#${id}" data-route="${id}"><span>${i}</span>${t}</a>`).join('')}</nav>
    <header class="workspace-heading"><div><h1 id="environmentTitle"></h1><p id="environmentSubtitle"></p></div><div class="live-label"><i></i><span id="environmentStatus">Verbinden…</span></div><button id="referenceButton" class="glass-button">Ontwerpvoorbeeld ↗</button></header>
    <div id="workspaceGrid" class="workspace-grid"></div>
  </div>
  <footer class="holo-footer"><span>MENS + AI = MEER MOGELIJK <i></i></span><span>Good ideas<br>go further <i></i></span></footer>
  <div id="conversationDock" class="conversation-dock glass" hidden><button class="dock-close" aria-label="Sluit gesprek">×</button><div id="conversationMount"></div><form id="dockForm"><input aria-label="Bericht aan Bob" placeholder="Geef Bob een opdracht…" required><button aria-label="Verstuur">➤</button></form></div>
  <dialog id="referenceDialog"><button aria-label="Sluit ontwerpvoorbeeld">×</button><p>Jouw ontwerpvoorbeeld — de namen en cijfers in deze afbeelding zijn voorbeeldinhoud.</p><img alt="Aangeleverd ontwerpvoorbeeld van deze omgeving"></dialog>
`;
document.body.insertBefore(stage, legacy);
const cards = Object.fromEntries([...document.querySelectorAll('.card')].map(c=>[c.id.replace('card-',''),c]));
const home = $('#homeScene'), workspace = $('#workspaceScene'), grid = $('#workspaceGrid');
let current = 'vandaag', snapshot = {}, refreshVersion = 0;
const routes = {
  vandaag:['Bob','Jouw slimme assistent','home'],
  whatsapp:['WhatsApp','Slimmer communiceren, met Bob aan je zijde.','whatsapp'],
  koppelen:['WhatsApp koppelen','Verbind WhatsApp met Bob via je telefoon.','connect'],
  outlook:['Outlook','Je mailbox, slimmer met Bob.','outlook'],
  mail:['Mail','Je inbox, slimmer met Bob.','mail'],
  google:['Google Workspace','Alles verbonden. Slimmer werken met Bob.','google'],
  agenda:['Planning & Productiviteit','Meer gedaan, minder gedoe.','google'],
  todoist:['Todoist','Ruimte in je hoofd. Overzicht over je taken.','google'],
  opdrachten:['Opdrachten','Geef het aan Bob. Volg hier wat hij doet.','social'],
  geheugen:['Geheugen','Wat Bob voor je onthoudt.','google'],
  bestanden:['Google Drive','Je bestanden, verbonden met Bob.','google'],
  photos:["Foto’s",'Jouw Google Foto’s, dichtbij.','google'],
  social:['Social Media','Eén overzicht. Al je kanalen.','social'],
  web:['Web Assistent','Slimmer surfen, sneller resultaat.','web'],
  instellingen:['Instellingen','Jouw verbindingen en voorkeuren.','home']
};
const aliases = {assistent:'opdrachten',herinneringen:'geheugen',notities:'geheugen',tools:'web'};
function mount(id) { if(cards[id]) {grid.append(cards[id]);const mark=cards[id].querySelector('.card-icon');if(mark&&artworkIcons[id])mark.innerHTML=glyph(id);} }
function custom(html, cls='') {const el=document.createElement('section');el.className=`card glass custom-card ${cls}`;el.innerHTML=html;grid.append(el);return el;}
function assistant() {
  return custom(`<div class="mini-head" aria-hidden="true"></div><h2>Bob Assistent <span class="online-dot"></span></h2><p>Jouw ${esc(current==='web'?'webassistent':'slimme assistent')}. Meer overzicht, meer ruimte.</p><button class="bob-command" data-ask="Geef me een overzicht van ${esc(routes[current][0])} op basis van mijn beschikbare gegevens.">✦ &nbsp; BOB opdracht: check ${esc(routes[current][0])} <span>➤</span></button><div class="assistant-actions">${[['▤','Maak samenvatting','Vat mijn beschikbare informatie kort samen.'],['✎','Schrijf een concept','Help me een conceptantwoord te schrijven. Vraag mij eerst waarvoor.'],['▦','Plan mijn dag','Help me mijn dag te plannen op basis van mijn agenda en taken.'],['⌕','Onderzoek','Help me met een onderzoek. Vraag wat ik wil onderzoeken.']].map(([i,t,q])=>`<button data-ask="${esc(q)}"><b>${i}</b>${t}</button>`).join('')}</div><button class="glass-button" data-conversation>Geef Bob een opdracht… &nbsp; ➤</button>`, 'assistant-side');
}
function mailPane(provider='gmail') {
  const data=snapshot.mail?.[provider];
  const messages=data?.messages || [];
  const el=custom(`<header class="card-head">${glyph(provider==='gmail'?'gmail':'outlook')}<h2>${provider==='gmail'?'Gmail':'Postvak IN'}</h2><span class="pill">${data?.ok ? `${data.unread || 0} ongelezen`:'niet verbonden'}</span></header><div class="mail-filter"><input aria-label="Zoek in berichten" placeholder="⌕  Zoek in berichten…"></div><div class="mail-list"></div>`, 'mail-list-card');
  const list=el.querySelector('.mail-list');
  const render=(filter='')=>{
    const matches=messages.filter(m=>`${m.from} ${m.subject}`.toLowerCase().includes(filter.toLowerCase()));
    list.innerHTML=!data?.ok?`<div class="empty-state"><span>✉</span><h3>${provider==='gmail'?'Google':'Outlook'} verbinden</h3><p>${esc(data?.error || 'Verbind je account om je berichten hier te zien.')}</p><a class="connect-btn" href="/oauth/${provider==='gmail'?'google':'microsoft'}/start">Account koppelen</a></div>`:matches.length?matches.map((m,i)=>`<button class="mail-item" data-message="${i}"><span class="row-av">${esc(String(m.from || '?').slice(0,1))}</span><span><b>${esc(m.from)}</b><strong>${esc(m.subject)}</strong><small>${esc(m.snippet || m.preview || m.account || '')}</small></span><span>›</span></button>`).join(''):'<div class="empty-state"><span>✓</span><h3>Helemaal bij</h3><p>Geen berichten gevonden in dit overzicht.</p></div>';
    list.querySelectorAll('[data-message]').forEach(b=>b.onclick=()=>showMessage(matches[Number(b.dataset.message)],provider));
  };
  el.querySelector('input').oninput=e=>render(e.target.value);render();
}
function showMessage(m,provider){
  const reader=$('#mailReader'); if(!reader)return;
  reader.innerHTML=`<div class="reader-meta"><span class="row-av">${esc(String(m.from||'?').slice(0,1))}</span><span>${esc(m.from)}<small>${esc(m.account||'')}</small></span></div><h2>${esc(m.subject)}</h2><p class="message-preview">${esc(m.snippet||m.preview||'Dit overzicht bevat alleen de afzender en het onderwerp. Open de originele mail om het volledige bericht te lezen.')}</p><a class="connect-btn" href="${safeLink(m.link,provider==='gmail'?'https://mail.google.com':'https://outlook.office.com/mail/')}" target="_blank" rel="noopener">Open volledige mail ↗</a><button class="glass-button" data-ask="${esc(`Help mij een conceptantwoord te maken op een mail met onderwerp: ${m.subject}. Vraag eerst naar de inhoud.`)}">✎ Schrijf met Bob</button>`;
}
function safeLink(link,fallback){try{const u=new URL(link);return /^https?:$/.test(u.protocol)?esc(u.href):fallback;}catch{return fallback;}}
function renderRoute(){
  const hash=decodeURIComponent(location.hash.slice(1)||'vandaag');current=aliases[hash]||hash;if(!routes[current])current='vandaag';
  Object.values(cards).forEach(c=>{if(c!==cards.assistent || $('#conversationDock').hidden)$('#grid').append(c);});grid.replaceChildren();
  const [title,subtitle,ref]=routes[current];
  stage.dataset.scene=ref;stage.style.setProperty('--scene',`url('/assets/reference/${ref}.jpeg')`);
  document.body.dataset.environment=current;
  home.hidden=current!=='vandaag';workspace.hidden=current==='vandaag';
  $('#environmentTitle').textContent=title;$('#environmentSubtitle').textContent=subtitle;
  $('#environmentStatus').textContent=snapshot.ok?'Verbonden met Bob':'Verbinding controleren…';
  document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===current));
  grid.className=`workspace-grid layout-${current}`;
  if(current==='google') {mailPane();mount('agenda');mount('drive');photos();}
  if(current==='mail'||current==='outlook'){
    if(current==='outlook') custom(`<h3>Mappen</h3><div class="folder-list">${['Postvak IN','Met ster','Verzonden','Concepten','Archief'].map(t=>`<a href="https://outlook.office.com/mail/" target="_blank" rel="noopener">✉ &nbsp; ${t} ↗</a>`).join('')}</div>`,'folders');
    mailPane(current==='mail'?'gmail':'outlook');
    custom('<div id="mailReader"><div class="empty-state"><span>✉</span><h2>Je mail, in alle rust.</h2><p>Kies een bericht uit je inbox.</p></div></div>','mail-reader');assistant();
  }
  if(current==='whatsapp') {mount('whatsapp');custom(`<div class="empty-state"><span>◉</span><h2>Altijd in contact.</h2><p>${snapshot.whatsapp?.ok?'Selecteer een chat om deze in WhatsApp te openen.':'Koppel WhatsApp om je recente gesprekken in Bob te zien.'}</p><a href="#koppelen" class="connect-btn">Apparaat koppelen</a><a class="glass-button" href="https://web.whatsapp.com" target="_blank" rel="noopener">Open WhatsApp Web ↗</a></div>`,'chat-reader');assistant();}
  if(current==='koppelen'){
    custom(`<div class="phone"><span>WhatsApp</span><p>☏ Nieuwe chat</p><strong>▣ Gekoppelde apparaten</strong><p>☆ Berichten met ster</p><p>⚙ Instellingen</p><em>Open WhatsApp<br>en ga naar<br>Gekoppelde apparaten</em></div>`,'phone-card');
    custom(`<h2 class="connect-title">${glyph('whatsapp')} WhatsApp koppelen</h2><p>Open WhatsApp op je telefoon en kies Gekoppelde apparaten.</p><div class="connect-body"><div class="qr-placeholder"><span>▣</span><b>${snapshot.whatsapp?.ok?'Apparaat verbonden':'Nog geen actieve QR-code'}</b><p>De lokale WhatsApp-verbinding levert op dit moment geen QR-code aan het dashboard.</p></div><ol><li><b>Open WhatsApp op je telefoon</b><p>Ga naar Gekoppelde apparaten via het menu.</p></li><li><b>Kies ‘Een apparaat koppelen’</b><p>Scan de actuele code in WhatsApp Web.</p></li><li><b>Koppel dit apparaat</b><p>Een WhatsApp Web-sessie is apart van de lokale BOB-verbinding.</p></li></ol></div><a class="connect-btn" href="https://web.whatsapp.com" target="_blank" rel="noopener">Open WhatsApp Web ↗</a><button class="glass-button" data-refresh>Status vernieuwen</button>`,'connect-panel');assistant();
  }
  if(['agenda','todoist'].includes(current)){mount('agenda');mount('todoist');assistant();}
  if(current==='opdrachten'){mount('opdrachten');mount('geheugen');assistant();}
  if(current==='geheugen'){mount('geheugen');mount('opdrachten');assistant();}
  if(current==='bestanden'){mount('drive');mount('google');assistant();}
  if(current==='photos'){photos();assistant();}
  if(current==='social'){
    custom(`<div class="social-intro"><div class="mini-head"></div><div><h2>“BOB opdracht:<br>open social media”</h2><p>Je kanalen, concepten en plannen op één plek.</p><button data-ask="Help mij een socialmediapost te schrijven. Vraag voor welk kanaal en onderwerp." class="connect-btn">＋ Nieuw concept</button></div></div>`,'social-intro-card');mount('social');mount('opdrachten');assistant();
  }
  if(current==='web'){
    custom(`<div class="browser-tabs"><span>✦ Bob Web Assistent</span><span>Onderzoek & inspiratie</span></div><form id="webAddress"><span>⌕</span><input aria-label="Website of zoekopdracht" placeholder="Voer een website of zoekopdracht in…" required><button>Open ↗</button></form><div class="web-welcome"><div class="mini-head"></div><h2>Waar gaan we naartoe?</h2><p>Open een website of geef Bob een onderzoeksopdracht.</p><div class="web-shortcuts"><a href="https://www.google.com" target="_blank" rel="noopener">${glyph('google')}Google</a><a href="https://www.bol.com" target="_blank" rel="noopener">${glyph('web')}bol</a><a href="#bestanden">${glyph('drive')}Mijn Drive</a></div><p class="web-note">Websites openen in een nieuw tabblad. Live meekijken en klikken op externe sites is nog niet aangesloten.</p><button class="connect-btn" data-ask="Onderzoek ">✦ Start onderzoek met Bob</button></div>`,'web-browser');assistant();
    $('#webAddress').onsubmit=e=>{e.preventDefault();let v=e.target.querySelector('input').value.trim();let url;try{url=new URL(v.includes('://')?v:`https://${v}`);if(!url.hostname.includes('.')||/\s/.test(v)||!/^https?:$/.test(url.protocol))throw Error();}catch{url=new URL(`https://www.google.com/search?q=${encodeURIComponent(v)}`);}window.open(url.href,'_blank','noopener');};
  }
  if(current==='instellingen'){
    custom(`<h2>Verbindingen</h2><p>Beheer je verbonden accounts.</p><div class="settings-links"><a href="/oauth/google/start">${glyph('google')} Google-account toevoegen ↗</a><a href="/oauth/microsoft/start">${glyph('outlook')} Microsoft verbinden ↗</a><a href="#koppelen">${glyph('whatsapp')} WhatsApp koppelen ›</a></div><label class="motion-setting"><input id="motionToggle" type="checkbox" ${localStorage.getItem('bob-motion')==='off'?'':'checked'}> Lichtdeeltjes en animaties</label>`);$('#motionToggle').onchange=e=>{localStorage.setItem('bob-motion',e.target.checked?'on':'off');document.body.classList.toggle('motion-off',!e.target.checked);};mount('google');
  }
  stage.classList.remove('arrive');void stage.offsetWidth;stage.classList.add('arrive');
}
function photos(){custom(`<header class="card-head">${glyph('photos')}<h2>Foto’s</h2></header><div class="empty-state"><span>✣</span><h3>Herinneringen in beeld</h3><p>Open je fotobibliotheek in Google Foto’s. Foto’s selecteren binnen Bob is nog niet aangesloten.</p><a href="https://photos.google.com" target="_blank" rel="noopener" class="glass-button">Open Google Foto’s ↗</a></div>`,'photos-card');}
function openConversation(){ $('#conversationMount').append(cards.assistent);$('#conversationDock').hidden=false;$('#dockForm input').focus();}
function ask(text){openConversation();$('#omniboxInput').value=text;$('#omnibox').requestSubmit();}
stage.addEventListener('click',e=>{
  const prompt=e.target.closest('[data-ask]');if(prompt){if(prompt.dataset.ask==='Onderzoek '){openConversation();$('#dockForm input').value='Onderzoek ';}else ask(prompt.dataset.ask);}
  if(e.target.closest('[data-conversation],.head-touch'))openConversation();
  if(e.target.closest('[data-refresh]')){$('#refreshBtn').click();refresh();}
});
$('#dockForm').onsubmit=e=>{e.preventDefault();const input=e.target.querySelector('input');ask(input.value);input.value='';};
$('.dock-close').onclick=()=>{$('#conversationDock').hidden=true;};
$('#omnibox').addEventListener('submit',()=>openConversation());
$('.brand').role='link';$('.brand').tabIndex=0;$('.brand').onclick=()=>location.hash='vandaag';$('.brand').onkeydown=e=>{if(e.key==='Enter')location.hash='vandaag';};
// Replace the old settings click target; voice wake-word remains in the voice layer.
const oldSettings=$('#settingsBtn'),settings=oldSettings.cloneNode(true);oldSettings.replaceWith(settings);settings.onclick=()=>location.hash='instellingen';
$('#referenceButton').onclick=()=>{const dlg=$('#referenceDialog');dlg.querySelector('img').src=`/assets/reference/${routes[current][2]}.jpeg`;dlg.showModal();};
$('#referenceDialog button').onclick=()=>$('#referenceDialog').close();
window.addEventListener('hashchange',renderRoute);
document.body.classList.toggle('motion-off',localStorage.getItem('bob-motion')==='off');
async function refresh(){const version=++refreshVersion;try{const res=await fetch('/api/all');if(!res.ok)throw Error();const data=await res.json();if(version!==refreshVersion)return;snapshot=data;renderRoute();}catch{$('#environmentStatus').textContent='Bob is momenteel offline';}}
renderRoute();refresh();
$('#refreshBtn').addEventListener('click',()=>setTimeout(refresh,300));
// A light, adaptive particle field adds depth without changing the supplied artwork.
const canvas=$('#particles'),ctx=canvas.getContext('2d');let width=0,height=0,last=0;
const points=Array.from({length:42},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.8+.6,v:Math.random()*.000015+.000005}));
function resize(){width=stage.clientWidth;height=stage.clientHeight;canvas.width=width;canvas.height=height;}
new ResizeObserver(resize).observe(stage);
function draw(now){requestAnimationFrame(draw);if(now-last<40)return;last=now;ctx.clearRect(0,0,width,height);if(document.hidden||document.body.classList.contains('motion-off')||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 points.forEach(p=>{p.y-=p.v*40;if(p.y<0)p.y=1;ctx.beginPath();ctx.fillStyle='rgba(180,255,238,.8)';ctx.shadowColor='#32ffc9';ctx.shadowBlur=12;ctx.arc(p.x*width,p.y*height,p.r,0,Math.PI*2);ctx.fill();});
}
requestAnimationFrame(draw);
