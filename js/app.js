/* ══════════════════════
   SECURITY UTILS
══════════════════════ */
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function isValidColor(c){ return typeof c==='string' && HEX_RE.test(c); }
function sanitizeColor(c){ return isValidColor(c) ? c : null; }
function sanitizeText(s){ return typeof s==='string' ? s.slice(0,200) : ''; }

/* ══════════════════════
   PALETTE & UTILS
══════════════════════ */
const PAL = Object.freeze(['#E8453C','#3B82F6','#F5C400','#FF6B35','#8B5CF6','#EC4899','#10B981','#0EA5E9']);
const PAL_SHOW = 5;
const NO_COL = '__nc__';

const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = n => '¥'+Math.round(n).toLocaleString('ja-JP');
const ini = s => (s||'?').trim()[0]||'?';

/* ══════════════════════
   STATE
══════════════════════ */
let groupName = '';
let members = [], payments = [], settlements = [];
let mId=0, pId=0, sId=0;
let colorLabels = {};
let expandedPal = new Set();
let tabMode = 'easy';
let selParts = new Set();
let colorRatios = {};
let isSharedView = false;

/* ══════════════════════
   SESSION STORAGE
══════════════════════ */
const SESSION_KEY = 'keishawari_v1';

function saveSession(){
  try{
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      groupName, members, payments, colorLabels, mId, pId
    }));
  }catch(e){}
}

function loadSession(){
  try{
    const raw = sessionStorage.getItem(SESSION_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    if(!d||!Array.isArray(d.members)||d.members.length<1) return false;
    groupName = sanitizeText(d.groupName||'');
    members = d.members.map(m=>({
      id: parseInt(m.id)||0,
      name: sanitizeText(m.name),
      color: sanitizeColor(m.color)
    }));
    payments = (d.payments||[]).map(p=>({
      id: parseInt(p.id)||0,
      payerId: parseInt(p.payerId)||0,
      participantIds: (p.participantIds||[]).map(Number),
      label: sanitizeText(p.label),
      amount: Math.max(0, parseFloat(p.amount)||0),
      ratios: Object.fromEntries(Object.entries(p.ratios||{}).map(([k,v])=>[parseInt(k), Math.max(0,parseFloat(v)||0)]))
    }));
    const rawCL = d.colorLabels||{};
    colorLabels = Object.fromEntries(
      Object.entries(rawCL)
        .filter(([k])=>isValidColor(k))
        .map(([k,v])=>[k, sanitizeText(v)])
    );
    mId = Math.max(0, ...members.map(m=>m.id), parseInt(d.mId)||0);
    pId = Math.max(0, ...payments.map(p=>p.id), parseInt(d.pId)||0);
    return true;
  }catch(e){ return false; }
}

function clearSession(){
  try{ sessionStorage.removeItem(SESSION_KEY); }catch(e){}
}

function showRestoreBanner(name){
  const b = document.getElementById('restore-banner');
  const n = document.getElementById('restore-name');
  if(b && n){ n.textContent = name||'データ'; b.style.display = 'flex'; }
}

/* ══════════════════════
   INIT / SHARED LOAD
══════════════════════ */
function startApp(){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById('s1');
  el.style.display='flex';el.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
}

(function init(){
  // Check for shared link
  const hash = location.hash;
  if(hash.startsWith('#d=')){
    try{
      const dec = JSON.parse(decodeURIComponent(atob(hash.slice(3))));
      loadShared(dec); return;
    }catch(e){ /* fall through */ }
  }
  // Check for session data (tab refresh)
  if(loadSession()){
    document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
    const s1=document.getElementById('s1');
    s1.style.display='flex';s1.classList.add('active');
    document.getElementById('group-name').value=groupName;
    renderMembers();
    if(payments.length>0) renderPaymentList_delayed();
    showRestoreBanner(groupName);
    return;
  }
  // New session → show intro
  addMember('');
  renderMembers();
})();

function renderPaymentList_delayed(){
  // payment list only renders when s2 is active, so we defer
  // (no-op here; payments will render when user navigates to s2)
}

function loadShared(d){
  isSharedView = true;
  groupName = sanitizeText(d.g||'');
  const rawCL = d.cl||{};
  colorLabels = Object.fromEntries(
    Object.entries(rawCL)
      .filter(([k])=>isValidColor(k))
      .map(([k,v])=>[k, sanitizeText(v)])
  );
  members = (d.m||[]).map(m=>({
    id: parseInt(m[0])||0,
    name: sanitizeText(m[1]),
    color: sanitizeColor(m[2])
  }));
  payments = (d.p||[]).map(p=>({
    id: parseInt(p[0])||0,
    payerId: parseInt(p[1])||0,
    participantIds: (p[2]||[]).map(Number),
    label: sanitizeText(p[3]),
    amount: Math.max(0, parseFloat(p[4])||0),
    ratios: Object.fromEntries(Object.entries(p[5]||{}).map(([k,v])=>[parseInt(k), Math.max(0,parseFloat(v)||0)]))
  }));
  settlements = (d.s||[]).map(s=>({
    id: parseInt(s[0])||0,
    fromId: parseInt(s[1])||0,
    toId: parseInt(s[2])||0,
    amount: Math.max(0, parseInt(s[3])||0),
    settled: false
  }));
  mId = Math.max(0,...members.map(m=>m.id));
  pId = Math.max(0,...payments.map(p=>p.id));
  sId = Math.max(0,...settlements.map(s=>s.id));

  // Show results screen directly
  document.querySelectorAll('.screen').forEach(s=>{s.style.display='none';s.classList.remove('active');});
  const s3 = document.getElementById('s3');
  s3.style.display='flex'; s3.classList.add('active');
  document.getElementById('s3-back-btn').style.display='none';
  document.getElementById('s3-steps').style.display='none';
  document.getElementById('reset-lnk').style.display='none';
  document.getElementById('shared-banner-wrap').innerHTML=`
    <div class="shared-banner">
      <span style="font-size:18px">🔗</span>
      <div><strong>${esc(groupName||'割り勘')}</strong>の精算結果ページです。<br>
      <span style="font-size:11px;opacity:.8">PayPayを開くできます。</span></div>
    </div>`;
  renderResults();
}

/* ══════════════════════
   MEMBERS
══════════════════════ */
function addMember(name=''){
  const id=++mId;
  members.push({id,name,color:null});
  renderMembers();
}
function removeMember(id){
  if(members.length<=2){alert('メンバーは2人以上必要です');return;}
  members=members.filter(m=>m.id!==id);
  payments.forEach(p=>{
    p.participantIds=p.participantIds.filter(x=>x!==id);
    if(p.payerId===id) p.payerId=members[0]?.id||0;
    if(p.ratios) delete p.ratios[id];
  });
  renderMembers();
  if(document.getElementById('s2').classList.contains('active')) renderForm();
}
function updateMemberName(id,val){
  const m=members.find(x=>x.id===id);if(!m)return;
  m.name=val;
  const av=document.getElementById('av-'+id);if(av)av.textContent=ini(val);
}
function updateMemberColor(id,col){
  const m=members.find(x=>x.id===id);if(!m)return;
  m.color=m.color===col?null:col;
  renderMemberItem(id);
  if(document.getElementById('s2').classList.contains('active')) renderForm();
}
function updateColorLabel(col,val){
  colorLabels[col]=val;
  if(tabMode==='keisha') updateRatioSection();
}
function getMember(id){return members.find(m=>m.id===id);}

function renderMembers(){
  const c=document.getElementById('member-list');c.innerHTML='';
  members.forEach(m=>renderMemberItem(m.id,c));
}
function renderMemberItem(id,container){
  const m=members.find(x=>x.id===id);if(!m)return;
  const c=container||document.getElementById('member-list');
  let el=document.getElementById('mi-'+id);
  const isNew=!el;
  if(isNew){el=document.createElement('div');el.id='mi-'+id;c.appendChild(el);}
  el.className='member-item';
  const exp=expandedPal.has(id);
  const vis=exp?PAL:PAL.slice(0,PAL_SHOW);
  const hidden=PAL.length-PAL_SHOW;
  const dots=vis.map(col=>`<div class="color-dot${m.color===col?' sel':''}" style="background:${col}" onclick="updateMemberColor(${id},'${col}')"></div>`).join('');
  const clearDot=`<div class="color-dot none-dot${m.color===null?' sel':''}" onclick="updateMemberColor(${id},null)" title="なし"></div>`;
  const expandBtn=!exp&&hidden>0
    ?`<button class="color-expand-btn" onclick="expandedPal.add(${id});renderMemberItem(${id})" title="全て表示">+${hidden}</button>`
    :exp?`<button class="color-expand-btn" onclick="expandedPal.delete(${id});renderMemberItem(${id})">−</button>`:'';
  const nameArea=m.color?`<div class="color-name-wrap">
    <div class="color-name-swatch" style="background:${m.color}"></div>
    <input class="color-name-input" type="text" placeholder="任意：カラー名（例：先輩、後輩）"
      value="${esc(colorLabels[m.color]||'')}" oninput="updateColorLabel('${m.color}',this.value)"/>
  </div>`:'';
  el.innerHTML=`
    <div class="member-top">
      <div class="member-avatar" id="av-${id}" style="background:${m.color||'var(--faint)'}">${esc(ini(m.name))}</div>
      <input class="member-name-input" type="text" placeholder="名前を入力" value="${esc(m.name)}"
        oninput="updateMemberName(${id},this.value)"/>
      <button class="member-del" onclick="removeMember(${id})" ${members.length<=2?'disabled':''} title="削除">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="color-section">
      <span class="color-section-lbl">任意：傾斜入力が必要な時に設定（例：先輩→赤、後輩→青）</span>
      <div class="color-row">${clearDot}${dots}${expandBtn}</div>
      ${nameArea}
    </div>`;
}

/* ══════════════════════
   NAVIGATION
══════════════════════ */
function goTo(id){
  if(id==='s2'){
    const gn=document.getElementById('group-name').value.trim();
    if(!gn){alert('グループ名を入力してください');document.getElementById('group-name').focus();return;}
    groupName=gn;
    const named=members.filter(m=>m.name.trim());
    if(named.length<2){alert('メンバーを2人以上入力してください');return;}
    document.getElementById('s2-title').textContent=gn+'の支払入力';
    saveSession();
  }
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById(id);
  el.style.display='flex';el.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='s2'){selParts=new Set(members.map(m=>m.id));colorRatios={};renderForm();renderPaymentList();}
}
function goBackToSetup(){
  if(payments.length===0&&settlements.length===0){
    goBack('s1'); return;
  }
  showConfirmModal(
    'メンバー設定に戻りますか？',
    '支払入力データがすべて削除されます。\nメンバーと属性の変更後、もう一度入力してください。',
    ()=>{
      payments=[];settlements=[];editingPaymentId=null;
      selParts=new Set(members.map(m=>m.id));colorRatios={};
      renderPaymentList();
      goBack('s1');
    }
  );
}

let _confirmCb=null;
function showConfirmModal(title,msg,onOk){
  _confirmCb=onOk;
  const existing=document.getElementById('confirm-modal');if(existing)existing.remove();
  const el=document.createElement('div');
  el.id='confirm-modal';el.className='modal-bg';el.style.display='flex';
  el.innerHTML=`<div class="modal-sheet" style="text-align:center">
    <div style="font-size:28px;margin-bottom:10px">⚠️</div>
    <div class="modal-ttl">${esc(title)}</div>
    <div style="font-size:13px;color:var(--muted);margin:10px 0 22px;line-height:1.7;white-space:pre-line">${esc(msg)}</div>
    <button onclick="execConfirm()"
      style="display:block;width:100%;padding:14px;border-radius:var(--r-full);background:var(--green);color:#fff;font-weight:800;font-size:15px;margin-bottom:10px">
      削除して戻る
    </button>
    <button onclick="document.getElementById('confirm-modal').remove()"
      style="display:block;width:100%;padding:12px;border-radius:var(--r-full);background:var(--bg);border:1.5px solid var(--border);font-weight:700;font-size:14px">
      キャンセル
    </button>
  </div>`;
  document.body.appendChild(el);
}
function execConfirm(){
  document.getElementById('confirm-modal')?.remove();
  if(_confirmCb){const cb=_confirmCb;_confirmCb=null;cb();}
}

function goBack(id){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById(id);
  el.style.display='flex';el.classList.add('back');
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='s2'){renderForm();renderPaymentList();}
}
function goToResults(){
  if(payments.length===0){alert('支払を1件以上登録してください');return;}
  computeSettlements();
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById('s3');
  el.style.display='flex';el.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  document.getElementById('s3-title').textContent=groupName+'の精算結果';
  renderResults();
}
function resetAll(){
  showConfirmModal(
    '支払データを削除しますか？',
    '登録済みの支払データがすべて削除されます。\nメンバー設定・グループ名はそのまま残ります。',
    ()=>{
      payments=[];settlements=[];editingPaymentId=null;
      selParts=new Set(members.map(m=>m.id));colorRatios={};
      saveSession();
      renderPaymentList();
      goBack('s2');
    }
  );
}

/* ══════════════════════
   SHARE / COPY RESULT
══════════════════════ */
function buildResultText(){
  computeSettlements();
  const total=payments.reduce((s,p)=>s+p.amount,0);
  // Header + summary
  let txt=`【${groupName}の精算結果】\n`;
  txt+=`合計：${fmt(total)}\n`;
  payments.forEach(p=>{
    txt+=`　・${p.label}・${p.participantIds.length}人：${fmt(p.amount)}\n`;
  });
  // Settlement flow
  txt+='\n【精算フロー】\n';
  if(settlements.length===0){
    txt+='精算不要！\n';
  }else{
    settlements.forEach(s=>{
      const fr=getMember(s.fromId),to=getMember(s.toId);
      if(!fr||!to)return;
      txt+=`${fr.name} → ${to.name}：${fmt(s.amount)}\n`;
    });
  }
  // Per-person breakdown
  txt+='\n【個人別内訳】\n';
  const pTot={},pBk={};
  members.forEach(m=>{pTot[m.id]=0;pBk[m.id]=[];});
  payments.forEach(p=>{
    const allParts=p.participantIds.filter(id=>getMember(id));
    const payingParts=allParts.filter(id=>(p.ratios[id]??1)>0);
    const tu=payingParts.reduce((s,id)=>s+(p.ratios[id]??1),0);
    const u=tu>0?p.amount/tu:0;
    allParts.forEach(id=>{
      const ratio=p.ratios[id]??1;
      const sh=ratio>0&&tu>0?u*ratio:0;
      pTot[id]+=sh;
      pBk[id].push({label:p.label,amount:sh});
    });
  });
  members.forEach(m=>{
    txt+=`・${m.name}：合計：${fmt(Math.round(pTot[m.id]))}\n`;
    pBk[m.id].forEach(b=>{
      txt+=`　・${b.label}：${fmt(Math.round(b.amount))}\n`;
    });
  });
  return txt;
}
function copyResult(){
  computeSettlements();
  const resultTxt=buildResultText();
  // Robust copy: try Clipboard API first, fall back to execCommand
  const doCopy=()=>{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      return navigator.clipboard.writeText(resultTxt);
    }
    return Promise.reject('no clipboard api');
  };
  doCopy().then(()=>{
    showCopyDoneModal();
  }).catch(()=>{
    // execCommand fallback (works in most sandboxed environments)
    try{
      const ta=document.createElement('textarea');
      ta.value=resultTxt;
      ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.focus();ta.select();
      const ok=document.execCommand('copy');
      document.body.removeChild(ta);
      if(ok){showCopyDoneModal();}
      else{showCopyTextModal(resultTxt);}
    }catch(e){showCopyTextModal(resultTxt);}
  });
}
function showCopyTextModal(txt){
  // Last resort: show text for manual copy
  const el=document.createElement('div');
  el.className='modal-bg';el.style.display='flex';
  el.onclick=e=>{if(e.target===el)el.remove();};
  el.innerHTML=`<div class="modal-sheet">
    <div class="modal-ttl" style="text-align:center;margin-bottom:12px">テキストをコピー</div>
    <textarea style="width:100%;height:160px;padding:10px;border:1.5px solid var(--border);border-radius:var(--r-md);font-size:13px;resize:none;background:var(--bg)"
      readonly onclick="this.select()">${txt}</textarea>
    <div style="font-size:12px;color:var(--muted);text-align:center;margin:8px 0 16px">テキストを長押し→全選択→コピーしてください</div>
    <button onclick="this.closest('.modal-bg').remove()"
      style="display:block;width:100%;padding:14px;border-radius:var(--r-full);background:var(--green);color:#fff;font-weight:800;font-size:15px">
      閉じる
    </button>
  </div>`;
  document.body.appendChild(el);
}
function showCopyDoneModal(){
  const existing=document.getElementById('copy-done-modal');if(existing)existing.remove();
  const el=document.createElement('div');
  el.id='copy-done-modal';el.className='modal-bg';el.style.display='flex';
  el.onclick=e=>{if(e.target===el)el.remove();};
  el.innerHTML=`<div class="modal-sheet" style="text-align:center">
    <div style="font-size:40px;margin-bottom:12px">✅</div>
    <div class="modal-ttl">コピーしました！</div>
    <div style="font-size:13px;color:var(--muted);margin:10px 0 22px;line-height:1.7">
      精算結果をクリップボードにコピーしました。<br>LINEやメッセージにそのまま貼り付けて共有できます。
    </div>
    <button onclick="document.getElementById('copy-done-modal').remove()"
      style="display:block;width:100%;padding:14px;border-radius:var(--r-full);background:var(--green);color:#fff;font-weight:800;font-size:15px">
      閉じる
    </button>
  </div>`;
  document.body.appendChild(el);
}

/* ══════════════════════
   TAB
══════════════════════ */
function switchTab(mode){
  tabMode=mode;
  document.getElementById('tab-easy').classList.toggle('active',mode==='easy');
  document.getElementById('tab-keisha').classList.toggle('active',mode==='keisha');
  renderForm();
}

/* ══════════════════════
   PAYMENT FORM (unified)
══════════════════════ */
function renderForm(){
  const card=document.getElementById('form-card');
  const savedPayerId=parseInt(card.dataset.payerId)||members[0]?.id;
  const payerOpts=members.map(m=>`<option value="${m.id}">${esc(m.name||'?')}</option>`).join('');
  const chipsHtml=members.map(m=>{
    const on=selParts.has(m.id);const bg=m.color||'var(--faint)';
    return `<div class="chip${on?' on':''}" style="${on?`background:${bg};border-color:${bg}`:''}" data-id="${m.id}" onclick="toggleChip(${m.id})">
      <div class="chip-av" style="background:${on?'rgba(255,255,255,.25)':bg}">${esc(ini(m.name))}</div>
      ${esc(m.name||'?')}
      <div class="chip-ck${on?' on':''}">
        ${on?`<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:''}
      </div>
    </div>`;
  }).join('');
  const showRatio=tabMode==='keisha';
  const tabHint=showRatio
    ?`<div style="font-size:12px;color:var(--muted);padding:8px 11px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:14px;line-height:1.7">グループ別に<strong style="color:var(--text)">1人あたりの金額</strong>を設定します。グループ設定でカラーを割り当てていない場合は全員均等扱いです。</div>`
    :`<div style="font-size:12px;color:var(--muted);padding:8px 11px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r-md);margin-bottom:14px;line-height:1.7">選択した対象者全員で<strong style="color:var(--text)">均等に割り勘</strong>します。傾斜をつけたい場合は「傾斜入力」タブをご利用ください。</div>`;
  card.innerHTML=`
    <div class="s-row">
      <input class="s-input" type="text" id="p-label" placeholder="必須：支払名称（例：タクシー代、二次会）" maxlength="30" style="flex:1"/>
    </div>
    <div class="s-row">
      <span class="kw">合計 ¥</span>
      <input class="s-input amt" type="number" id="p-amount" autocomplete="off" min="0" placeholder="12,000" oninput="${showRatio?'updateRatioSection()':''}"/>
      <span class="kw">かかった。</span>
    </div>
    <div class="s-row">
      <select class="payer-sel" id="payer-sel" onchange="document.getElementById('form-card').dataset.payerId=this.value">${payerOpts}</select>
      <span class="kw">が立替払い</span>
    </div>
    <div class="chips-lbl">対象者（タップで選択・解除）</div>
    <div class="chips-wrap">${chipsHtml}</div>
    ${tabHint}
    ${showRatio?'<div id="ratio-wrap"></div>':''}
    <button class="reg-btn" id="reg-btn" onclick="registerPayment()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>登録する
    </button>
    <button class="clr-btn" onclick="clearForm()">クリア</button>`;
  const sel=document.getElementById('payer-sel');
  if(sel&&savedPayerId){sel.value=savedPayerId;if(!sel.value&&members.length)sel.value=members[0].id;}
  if(showRatio) updateRatioSection();
}
function toggleChip(mid){
  if(selParts.has(mid))selParts.delete(mid);else selParts.add(mid);
  const pid=parseInt(document.getElementById('payer-sel')?.value);
  const savedLabel=document.getElementById('p-label')?.value||'';
  const savedAmount=document.getElementById('p-amount')?.value||'';
  document.getElementById('form-card').dataset.payerId=pid;
  renderForm();
  const la=document.getElementById('p-label');if(la)la.value=savedLabel;
  const am=document.getElementById('p-amount');if(am){am.value=savedAmount;if(tabMode==='keisha'&&savedAmount)updateRatioSection();}
}
// Helper: undefined → 1 (default), explicitly set 0 → 0
function getColRatio(k){ return Object.prototype.hasOwnProperty.call(colorRatios,k)?colorRatios[k]:1; }

function updateRatioSection(){
  const wrap=document.getElementById('ratio-wrap');if(!wrap)return;
  const amount=parseFloat(document.getElementById('p-amount')?.value)||0;
  const groups={};
  Array.from(selParts).forEach(id=>{
    const m=getMember(id);if(!m)return;
    const key=m.color||NO_COL;
    if(!groups[key])groups[key]={color:m.color,mems:[]};
    groups[key].mems.push(m);
  });
  const keys=Object.keys(groups);
  if(keys.length===0){wrap.innerHTML='';return;}
  const totalUnits=keys.reduce((s,k)=>s+groups[k].mems.length*getColRatio(k),0);
  const rows=keys.map(k=>{
    const g=groups[k],ratio=getColRatio(k);
    const pp=totalUnits>0?(amount*ratio/totalUnits):0;
    const colLabel=(g.color&&colorLabels[g.color])||(!g.color?'（カラーなし）':'グループ');
    const mnames=g.mems.map(m=>m.name||'?').join('・');
    const sw=g.color
      ?`<div class="ratio-sw" style="background:${g.color}">${g.mems.length}</div>`
      :`<div class="ratio-sw" style="background:var(--faint)">${g.mems.length}</div>`;
    const prevTxt=!amount?'¥—':ratio===0?'¥0（支払なし）':fmt(pp);
    const prevCol=ratio===0?'var(--faint)':'var(--green)';
    return `<div class="ratio-group">
      <div class="ratio-left">${sw}
        <div><div class="ratio-nm">${esc(colLabel)}</div><div class="ratio-members">${esc(mnames)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <span style="font-size:13px;color:var(--muted);font-weight:700">×</span>
        <input class="ratio-input" type="text" inputmode="decimal" value="${ratio}"
          oninput="setColorRatio('${k}',this.value)"/>
      </div>
      <div class="ratio-preview">
        <div class="ratio-prev-amt" id="rprev-${k}" style="color:${prevCol}">${prevTxt}</div>
        <div class="ratio-prev-lbl">/ 1人</div>
        <div class="amt-stepper">
          <button class="amt-step-btn" type="button" onclick="stepAmt('${k}',-100)">&#8722;</button>
          <input class="amt-step-input" id="ramt-${k}" type="text" inputmode="numeric"
            value="${amount>0&&ratio>0?Math.round(amount*ratio/Math.max(totalUnits,0.001)):''}"
            placeholder="¥—"
            oninput="syncRatioFromAmt('${k}',this.value)"
          />
          <button class="amt-step-btn" type="button" onclick="stepAmt('${k}',100)">&#43;</button>
        </div>
      </div>
    </div>`;
  }).join('');
  wrap.innerHTML=`<div class="ratio-box">
    <div class="ratio-box-ttl">傾斜設定</div>
    <div style="font-size:11px;color:var(--muted);margin:-4px 0 10px;line-height:1.7">右の金額欄に<strong>1人あたりの金額</strong>を入力（±ボタンで100円単位に調整）。比率（×）を直接変更することもできます。</div>
    ${rows}
  </div>`;
}
function setColorRatio(k,val){
  const t=String(val).trim();
  if(t===''||t==='-')return; // partial input — don't overwrite ratio
  const v=parseFloat(t);
  if(isNaN(v))return;
  colorRatios[k]=Math.max(0,v);
  updateRatioPreviews();
}

function updateRatioPreviews(){
  const wrap=document.getElementById('ratio-wrap');if(!wrap)return;
  const amount=parseFloat(document.getElementById('p-amount')?.value)||0;
  const groups={};
  Array.from(selParts).forEach(id=>{
    const m=getMember(id);if(!m)return;
    const key=m.color||NO_COL;
    if(!groups[key])groups[key]={mems:[]};
    groups[key].mems.push(m);
  });
  const totalUnits=Object.keys(groups).reduce((s,k)=>s+groups[k].mems.length*getColRatio(k),0);
  Object.keys(groups).forEach(k=>{
    const el=document.getElementById('rprev-'+k);if(!el)return;
    const ratio=getColRatio(k);
    const pp=totalUnits>0?(amount*ratio/totalUnits):0;
    const txt=!amount?'¥—':ratio===0?'¥0（支払なし）':fmt(pp);
    el.textContent=txt;
    el.style.color=ratio===0?'var(--faint)':'var(--green)';
    // sync amt input (only when not focused to avoid cursor jump)
    const ai=document.getElementById('ramt-'+k);
    if(ai&&document.activeElement!==ai){
      ai.value=amount>0&&ratio>0?Math.round(pp):'';
    }
  });
}

/* ±100円ステッパー:
   first press → snap to 100-yen ceiling (＋) or floor (−)
   subsequent → ±100 in steps; clamped to 0 〜 total amount */
function stepAmt(k,delta){
  const amount=parseFloat(document.getElementById('p-amount')?.value)||0;
  if(!amount){showAlert('先に合計金額を入力してください','金額未入力');return;}
  const el=document.getElementById('ramt-'+k);if(!el)return;
  const raw=parseFloat(el.value);
  const cur=isNaN(raw)?0:Math.round(raw);
  const onBoundary=cur%100===0;
  let next;
  if(delta>0){
    next=onBoundary?cur+100:Math.ceil(cur/100)*100;
  }else{
    next=onBoundary?cur-100:Math.floor(cur/100)*100;
  }
  // clamp 0 〜 合計金額
  next=Math.max(0,Math.min(amount,next));
  el.value=next;
  syncRatioFromAmt(k,String(next));
  // re-assert after syncRatioFromAmt may overwrite via updateRatioPreviews
  el.value=next;
}

/* 金額直接入力 → 比率を逆算 */
function syncRatioFromAmt(k,val){
  if(val===''||val===null){
    // blank → restore default ratio so it's not stuck as "no payment"
    delete colorRatios[k];
    const ri=document.querySelector('.ratio-input[oninput*="\''+k+'\'"]');
    if(ri&&document.activeElement!==ri)ri.value=getColRatio(k);
    updateRatioPreviews();
    return;
  }
  const amount=parseFloat(document.getElementById('p-amount')?.value)||0;
  if(!amount)return;
  const targetAmt=parseFloat(val);
  if(isNaN(targetAmt)||targetAmt<0)return;
  const groups={};
  Array.from(selParts).forEach(id=>{
    const m=getMember(id);if(!m)return;
    const key=m.color||NO_COL;
    if(!groups[key])groups[key]={mems:[]};
    groups[key].mems.push(m);
  });
  const g=groups[k];if(!g||!g.mems.length)return;
  const groupSize=g.mems.length;
  const totalOthers=Object.keys(groups).filter(kk=>kk!==k)
    .reduce((s,kk)=>s+groups[kk].mems.length*getColRatio(kk),0);
  // 単一グループの場合は比率を変えても按分は変わらないため、ratioは変更しない
  if(totalOthers<0.001){
    updateRatioPreviews();
    return;
  }
  // Solve: targetAmt = amount * ratio_k / (groupSize*ratio_k + totalOthers)
  const denom=amount-targetAmt*groupSize;
  let r=Math.abs(denom)<0.01
    ?(targetAmt*totalOthers/0.01)
    :(targetAmt*totalOthers)/denom;
  if(r<0||!isFinite(r))r=0;
  colorRatios[k]=Math.round(r*100)/100;
  // Sync the ratio input (×) display
  const ri=document.querySelector('.ratio-input[oninput*="\''+k+'\'"]');
  if(ri&&document.activeElement!==ri)ri.value=colorRatios[k];
  updateRatioPreviews();
}
function clearForm(){
  editingPaymentId=null;
  selParts=new Set(members.map(m=>m.id));colorRatios={};renderForm();renderPaymentList();
}

/* ══════════════════════
   REGISTER / EDIT PAYMENT
══════════════════════ */
let editingPaymentId = null;

function registerPayment(){
  const payerEl=document.getElementById('payer-sel');
  const payerId=parseInt(payerEl?.value||0);
  if(!payerId||!getMember(payerId)){
    showAlert('立替払いした人を選んでください','立替者未設定');
    return;
  }
  const partIds=Array.from(selParts);
  if(partIds.length===0){
    showAlert('対象者を1人以上選んでください','対象者未設定');
    return;
  }
  const label=(document.getElementById('p-label')?.value||'').trim();
  if(!label){
    showAlert('支払名称を入力してください','支払名称未入力');
    document.getElementById('p-label')?.focus();
    return;
  }
  const amount=parseFloat(document.getElementById('p-amount')?.value||0);
  if(!amount||amount<=0){
    showAlert('合計金額を入力してください','金額未入力');
    document.getElementById('p-amount')?.focus();
    return;
  }
  const ratios={};
  partIds.forEach(id=>{
    const m=getMember(id);if(!m)return;
    const k=m.color||NO_COL;ratios[id]=getColRatio(k);
  });
  // 全員0チェック
  const allZero=partIds.every(id=>(ratios[id]??1)===0);
  if(allZero){
    showAlert('全員の傾斜比率が0です。\n少なくとも1人以上の比率を設定してください。','比率エラー');
    return;
  }
  // 傾斜モード：概算合計が入力合計と一致するか検証
  if(tabMode==='keisha'){
    const payingParts=partIds.filter(id=>(ratios[id]??1)>0);
    const tu=payingParts.reduce((s,id)=>s+(ratios[id]??1),0);
    if(tu>0){
      const computed=payingParts.reduce((s,id)=>s+(amount*(ratios[id]??1)/tu),0);
      const diff=Math.abs(Math.round(computed)-Math.round(amount));
      if(diff>1){
        showAlert(
          `概算金額の合計（${fmt(Math.round(computed))}）が\n入力合計（${fmt(amount)}）と一致していません。\n\n各グループの金額欄を調整するか、\n合計金額を修正してください。`,
          '合計金額不一致'
        );
        return;
      }
    }
  }
  if(editingPaymentId!==null){
    const idx=payments.findIndex(p=>p.id===editingPaymentId);
    if(idx>=0)payments[idx]={id:editingPaymentId,payerId,participantIds:partIds,label,amount,ratios};
    editingPaymentId=null;
  }else{
    payments.push({id:++pId,payerId,participantIds:partIds,label,amount,ratios});
  }
  selParts=new Set(members.map(m=>m.id));colorRatios={};
  saveSession();
  renderForm();renderPaymentList();
}

/* ポップアップアラート（alert()の代替） */
function showAlert(msg,title){
  const existing=document.getElementById('alert-modal');if(existing)existing.remove();
  const el=document.createElement('div');el.id='alert-modal';el.className='modal-bg';el.style.display='flex';
  el.onclick=e=>{if(e.target===el)el.remove();};
  el.innerHTML=`<div class="modal-sheet" style="text-align:center">
    <div style="font-size:28px;margin-bottom:8px">⚠️</div>
    <div class="modal-ttl">${esc(title||'入力エラー')}</div>
    <div style="font-size:13px;color:var(--muted);margin:10px 0 20px;line-height:1.8;white-space:pre-line">${esc(msg)}</div>
    <button onclick="document.getElementById('alert-modal').remove()"
      style="display:block;width:100%;padding:13px;border-radius:var(--r-full);background:var(--green);color:#fff;font-weight:800;font-size:15px;cursor:pointer;border:none">
      確認
    </button>
  </div>`;
  document.body.appendChild(el);
}

function editPayment(id){
  const p=payments.find(x=>x.id===id);if(!p)return;
  editingPaymentId=id;
  // Restore participants
  selParts=new Set(p.participantIds);
  // Restore colorRatios from per-member ratios (first member per color wins)
  colorRatios={};
  p.participantIds.forEach(mid=>{
    const m=getMember(mid);if(!m)return;
    const k=m.color||NO_COL;
    if(!Object.prototype.hasOwnProperty.call(colorRatios,k)) colorRatios[k]=p.ratios[mid]??1;
  });
  // Switch to appropriate tab
  const hasRatio=Object.values(p.ratios).some(r=>r!==1);
  if(hasRatio) switchTab('keisha'); else switchTab('easy');
  // Re-render form then fill fields
  const card=document.getElementById('form-card');
  card.dataset.payerId=p.payerId;
  renderForm();
  // Fill text fields after render
  requestAnimationFrame(()=>{
    const la=document.getElementById('p-label');if(la)la.value=p.label;
    const am=document.getElementById('p-amount');if(am){am.value=p.amount;if(tabMode==='keisha')updateRatioSection();}
    const ps=document.getElementById('payer-sel');if(ps)ps.value=p.payerId;
    // Update register button label
    const btn=document.getElementById('reg-btn');
    if(btn)btn.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>更新する`;
  });
  // Scroll to form
  document.getElementById('form-card').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function removePayment(id){
  if(editingPaymentId===id){editingPaymentId=null;selParts=new Set(members.map(m=>m.id));colorRatios={};renderForm();}
  payments=payments.filter(p=>p.id!==id);
  saveSession();
  renderPaymentList();
}
function renderPaymentList(){
  const c=document.getElementById('payment-list');c.innerHTML='';
  if(payments.length===0){c.innerHTML='<div class="no-payments">まだ登録されていません</div>';return;}
  payments.forEach(p=>{
    const payer=getMember(p.payerId);
    const hasRatio=Object.values(p.ratios).some(r=>r!==1);
    const avs=p.participantIds.map(id=>{const m=getMember(id);if(!m)return'';return`<div class="mini-av" style="background:${m.color||'var(--faint)'}" title="${esc(m.name)}">${esc(ini(m.name))}</div>`;}).join('');
    const isEditing=editingPaymentId===p.id;
    const d=document.createElement('div');
    d.className='p-card';
    if(isEditing) d.style.cssText='border-color:var(--green);background:var(--green-lt)';
    d.innerHTML=`
      <div class="mini-av" style="background:${payer?.color||'var(--faint)'};width:33px;height:33px;font-size:13px">${esc(ini(payer?.name))}</div>
      <div class="p-body">
        <div class="p-label">${esc(p.label)}${isEditing?'<span style="font-size:10px;color:var(--green);font-weight:700;margin-left:6px;vertical-align:middle">編集中</span>':''}</div>
        <div class="p-meta">
          <span class="p-amount">${fmt(p.amount)}</span>
          <span style="color:var(--border)">│</span>
          <div class="mini-av-row">${avs}</div>
          <span style="font-size:11px;color:var(--muted)">${p.participantIds.length}人${hasRatio?' / 傾斜あり':''}</span>
        </div>
      </div>
      <button class="p-edit" onclick="editPayment(${p.id})" title="編集" style="width:30px;height:30px;border-radius:var(--r-full);display:flex;align-items:center;justify-content:center;color:${isEditing?'var(--green)':'var(--muted)'};flex-shrink:0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="p-del" onclick="removePayment(${p.id})" title="削除">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>`;
    c.appendChild(d);
  });
}

/* ══════════════════════
   CALCULATION
══════════════════════ */
function computeSettlements(){
  settlements=[];sId=0;
  const EPS=0.5,net={};
  members.forEach(m=>{net[m.id]=0;});
  payments.forEach(p=>{
    const ps=p.participantIds.filter(id=>getMember(id)&&(p.ratios[id]??1)>0); // exclude ratio=0
    if(!ps.length) return;
    const tu=ps.reduce((s,id)=>s+(p.ratios[id]??1),0);
    if(!tu) return;
    const u=p.amount/tu;
    ps.forEach(id=>{net[id]+=u*(p.ratios[id]??1);});
    if(p.payerId&&net[p.payerId]!==undefined)net[p.payerId]-=p.amount;
  });
  const crs=[],dbs=[];
  members.forEach(m=>{
    const n=net[m.id];
    if(n<-EPS)crs.push({id:m.id,amount:-n});
    else if(n>EPS)dbs.push({id:m.id,amount:n});
  });
  let ci=0,di=0;
  while(ci<crs.length&&di<dbs.length){
    const cr=crs[ci],db=dbs[di];
    const t=Math.min(cr.amount,db.amount);
    if(t>EPS)settlements.push({id:++sId,fromId:db.id,toId:cr.id,amount:Math.round(t),settled:false});
    cr.amount-=t;db.amount-=t;
    if(cr.amount<EPS)ci++;
    if(db.amount<EPS)di++;
  }
}

/* ══════════════════════
   RESULTS
══════════════════════ */
function renderResults(){
  const total=payments.reduce((s,p)=>s+p.amount,0);
  const c=document.getElementById('result-container');c.innerHTML='';
  document.getElementById('result-sub').textContent=`合計 ${fmt(total)} ／ ${members.length}人 ／ ${payments.length}件`;

  const gt=document.createElement('div');gt.className='result-grand';
  gt.innerHTML=`<span class="result-grand-lbl">合計お会計</span><span class="result-grand-amt">${fmt(total)}</span>`;
  c.appendChild(gt);

  // Per-person
  const h1=document.createElement('div');h1.className='r-head';
  h1.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> 個人別内訳`;
  c.appendChild(h1);

  const pTot={},pBk={};
  members.forEach(m=>{pTot[m.id]=0;pBk[m.id]=[];});
  payments.forEach(p=>{
    const allParts=p.participantIds.filter(id=>getMember(id));
    const payingParts=allParts.filter(id=>(p.ratios[id]??1)>0);
    const tu=payingParts.reduce((s,id)=>s+(p.ratios[id]??1),0);
    const u=tu>0?p.amount/tu:0;
    const payerMember=getMember(p.payerId);
    // All members get a row: participants with their share, non-participants with ¥0
    members.forEach(m=>{
      const isParticipant=allParts.includes(m.id);
      const ratio=isParticipant?(p.ratios[m.id]??1):null;
      const sh=isParticipant&&ratio>0&&tu>0?u*ratio:0;
      if(isParticipant) pTot[m.id]+=sh;
      pBk[m.id].push({
        label:p.label,
        amount:sh,
        noCharge:isParticipant&&ratio===0,
        notAttend:!isParticipant,
        payerName:payerMember?.name||'',
        payerColor:payerMember?.color||null
      });
    });
  });
  members.forEach(m=>{
    const rows=pBk[m.id].map(b=>{
      const bg=b.payerColor||'var(--faint)';
      const amtTxt=b.notAttend?'¥0（不参加）':b.noCharge?'¥0（支払なし）':fmt(b.amount);
      const amtCol=(b.notAttend||b.noCharge)?'var(--faint)':'inherit';
      const payerBadge=b.notAttend?'':
        `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 5px;border-radius:var(--r-full);background:${bg}22;color:${bg};font-size:10px;font-weight:700;vertical-align:middle;border:1px solid ${bg}55">
          <span style="width:8px;height:8px;border-radius:50%;background:${bg};display:inline-block;flex-shrink:0"></span>
          ${esc(b.payerName)}
        </span>`;
      return `<div class="bk-row" style="${b.notAttend?'opacity:.45':''}">
        <span class="bk-lbl">${esc(b.label)} ${payerBadge}</span>
        <span class="bk-amt" style="color:${amtCol}">${amtTxt}</span>
      </div>`;
    }).join('');
    const card=document.createElement('div');card.className='person-card';
    const colorLabel=m.color&&colorLabels[m.color]?`<span class="badge badge-payer">${esc(colorLabels[m.color])}</span>`:'';
    card.innerHTML=`
      <div class="person-card-head">
        <div class="person-card-name">
          <div class="member-avatar" style="background:${m.color||'var(--faint)'};width:30px;height:30px;font-size:13px">${esc(ini(m.name))}</div>
          ${esc(m.name)}${colorLabel}
        </div>
        <span class="person-card-total">${fmt(Math.round(pTot[m.id]))}</span>
      </div>
      <div class="person-card-body">${rows||'<span style="color:var(--faint);font-size:13px">参加なし</span>'}</div>`;
    c.appendChild(card);
  });

  // Settlement
  const h2=document.createElement('div');h2.className='r-head';h2.style.marginTop='22px';
  h2.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> 精算フロー`;
  c.appendChild(h2);

  if(settlements.length===0){
    const ac=document.createElement('div');ac.className='all-clear';
    ac.innerHTML='<div style="font-size:30px;margin-bottom:6px">🎉</div><div style="font-weight:700">精算不要！全員清算済みです。</div>';
    c.appendChild(ac);return;
  }

  const sc=document.createElement('div');sc.className='settle-card';sc.id='sc';c.appendChild(sc);
  renderSettlements();

  // PayPay app button below settlement
  const ppWrap=document.createElement('div');ppWrap.style.cssText='margin-top:12px;margin-bottom:4px';
  ppWrap.innerHTML=`
    <a href="paypay://" onclick="setTimeout(()=>window.open('https://paypay.ne.jp/','_blank','noopener,noreferrer'),1200)"
      style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;border-radius:var(--r-full);background:#D3000D;color:#fff;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 4px 14px rgba(211,0,13,.28);transition:all .2s"
      onmouseenter="this.style.background='#AA000A'" onmouseleave="this.style.background='#D3000D'">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
      PayPayを開く
    </a>
    <p style="text-align:center;font-size:11px;color:var(--faint);margin-top:6px">
      ※ スマートフォンにPayPayがインストールされている場合に起動します
    </p>`;
  c.appendChild(ppWrap);
}

function renderSettlements(){
  const sc=document.getElementById('sc');if(!sc)return;sc.innerHTML='';
  settlements.forEach(s=>{
    const fr=getMember(s.fromId),to=getMember(s.toId);if(!fr||!to)return;
    const d=document.createElement('div');d.className='settle-item'+(s.settled?' done':'');
    d.innerHTML=`
      <div class="settle-left">
        <div class="mini-av" style="background:${fr.color||'var(--faint)'}">${esc(ini(fr.name))}</div>
        <span class="settle-name">${esc(fr.name)}</span>
        <span class="settle-arrow">→</span>
        <div class="mini-av" style="background:${to.color||'var(--faint)'}">${esc(ini(to.name))}</div>
        <span class="settle-to">${esc(to.name)}</span>
        <span class="settle-amt">${fmt(s.amount)}</span>
      </div>
      <div class="settle-actions">
        ${s.settled?`<span class="ck-btn done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> 清算済み</span>`:''}
      </div>`;
    sc.appendChild(d);
  });
}
/* ══════════════════════
   FEEDBACK
══════════════════════ */
const FEEDBACK_EMAIL='keishawari.tool@gmail.com';
function submitFeedback(){
  const typeEl=document.getElementById('fb-type');
  const msgEl=document.getElementById('fb-message');
  const type=(typeEl&&typeEl.value||'').trim();
  const msg=(msgEl&&msgEl.value||'').trim();
  if(!type){
    showFbAlert('種別を選択してください');
    return;
  }
  if(msg.length<5){
    showFbAlert('内容を5文字以上入力してください');
    if(msgEl)msgEl.focus();
    return;
  }
  const allowed=['bug','request','other'];
  const safeType=allowed.indexOf(type)>=0?type:'other';
  const safeMsg=msg.slice(0,1000).replace(/</g,'＜').replace(/>/g,'＞').replace(/&/g,'＆');
  const labels={bug:'不具合報告',request:'ご意見・ご要望',other:'その他'};
  const typeLabel=labels[safeType];
  const gName=(groupName||'未入力').slice(0,40);
  const composed='【種別】'+typeLabel+'\n【グループ名】'+gName+'\n\n【内容】\n'+safeMsg;
  // Build mailto href
  const sub=encodeURIComponent('[けいしゃ割] '+typeLabel);
  const bod=encodeURIComponent(composed);
  const href='mailto:'+FEEDBACK_EMAIL+'?subject='+sub+'&body='+bod;
  // Populate inline confirm panel
  const emailDisp=document.getElementById('fb-email-disp');
  if(emailDisp)emailDisp.textContent=FEEDBACK_EMAIL;
  const preview=document.getElementById('fb-preview');
  if(preview)preview.textContent=composed;
  const sendLink=document.getElementById('fb-send-link');
  if(sendLink)sendLink.href=href;
  const wrap=document.getElementById('fb-confirm-wrap');
  if(wrap){
    wrap.classList.add('visible');
    wrap.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  const btn=document.getElementById('fb-submit-btn');
  if(btn){btn.style.display='none';}
}
function fbCopy(){
  const preview=document.getElementById('fb-preview');
  const txt=preview?preview.textContent:'';
  const btn=document.getElementById('fb-copy-btn');
  function success(){
    if(btn){btn.textContent='✅ コピーしました';setTimeout(function(){btn.textContent='テキストをコピー';},2500);}
    showFbDone();
  }
  function fallback(){
    var ta=document.createElement('textarea');
    ta.value=txt;
    ta.setAttribute('readonly','');
    ta.style.cssText='position:absolute;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok=false;
    try{ok=document.execCommand('copy');}catch(e){}
    document.body.removeChild(ta);
    if(ok){success();}else{alert('テキストを手動でコピーして\n'+FEEDBACK_EMAIL+'\nへ送ってください。');}
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(success).catch(fallback);
  }else{fallback();}
}
function fbReset(){
  var wrap=document.getElementById('fb-confirm-wrap');
  if(wrap)wrap.classList.remove('visible');
  var btn=document.getElementById('fb-submit-btn');
  if(btn)btn.style.display='';
}
function showFbAlert(msg){
  var existing=document.getElementById('fb-alert');
  if(existing)existing.parentNode.removeChild(existing);
  var el=document.createElement('div');
  el.id='fb-alert';
  el.setAttribute('role','alert');
  el.style.cssText='color:#E8453C;font-size:12px;font-weight:600;padding:6px 0';
  el.textContent='⚠ '+msg;
  var btn=document.getElementById('fb-submit-btn');
  if(btn&&btn.parentNode)btn.parentNode.insertBefore(el,btn);
  setTimeout(function(){var a=document.getElementById('fb-alert');if(a&&a.parentNode)a.parentNode.removeChild(a);},4000);
}
function showFbDone(){
  var type=document.getElementById('fb-type');if(type)type.value='';
  var msg=document.getElementById('fb-message');if(msg)msg.value='';
  fbReset();
  var sec=document.getElementById('feedback-section');
  var d=document.createElement('div');
  d.style.cssText='background:var(--green-lt);border:1.5px solid var(--green);border-radius:var(--r-md);padding:14px;text-align:center;font-size:14px;font-weight:600;color:var(--green);margin-top:8px';
  d.textContent='✅ ありがとうございます！内容を確認後、対応いたします。';
  if(sec)sec.appendChild(d);
  setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d);},5000);
}

let _privacyReturnId=null;
function showPrivacyPage(){
  // Remember current screen to return to
  const cur=document.querySelector('.screen.active');
  _privacyReturnId=cur?cur.id:'s0';
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById('s_privacy');
  el.style.display='flex';el.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
}
function goBackFromPrivacy(){
  document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active','back');s.style.display='none';});
  const el=document.getElementById(_privacyReturnId||'s0');
  el.style.display='flex';el.classList.add('back');
  window.scrollTo({top:0,behavior:'instant'});
}
// Backward-compat: any old showPrivacyModal call routes to the page
function showPrivacyModal(){ showPrivacyPage(); }

function toggleSettle(id){
  const s=settlements.find(x=>x.id===id);if(!s)return;
  s.settled=!s.settled;renderSettlements();
}

function acceptCookies(){
  document.getElementById('cookie-banner').style.display='none';
  try{ sessionStorage.setItem('cookie_ok','1'); }catch(e){}
}
