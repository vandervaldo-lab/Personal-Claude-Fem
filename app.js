/* ── State ────────────────────────────────────────────────── */
let currentPhase = 0;
let currentDay   = 0;
let mainTab      = 'treino';
let evoChart     = null;

/* ── Storage ──────────────────────────────────────────────── */
const STORE_KEY = 'pt_fem_rir_v1';
function loadRIR() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; } }
function saveRIR(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {} }
function rirKey(dayKey, itemIdx, phase, session) { return `${dayKey}_i${itemIdx}_ph${phase}_s${session}`; }

/* ── Toast ────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ── Phase ────────────────────────────────────────────────── */
function setPhase(p) {
  currentPhase = p;
  document.querySelectorAll('.pt-pb').forEach((b, i) => b.classList.toggle('active', i === p));
  if (mainTab === 'treino') renderDay(); else renderEvo();
}

/* ── Main Tabs ────────────────────────────────────────────── */
function setMainTab(t) {
  mainTab = t;
  document.querySelectorAll('.pt-tab').forEach((b, i) => {
    const a = ['treino','evolucao'][i] === t;
    b.classList.toggle('active', a);
    b.setAttribute('aria-selected', String(a));
  });
  document.getElementById('tab-treino').classList.toggle('hidden', t !== 'treino');
  document.getElementById('tab-evolucao').classList.toggle('hidden', t !== 'evolucao');
  if (t === 'evolucao') { populateEvoSelect(); renderEvo(); }
}

/* ── Day Nav ──────────────────────────────────────────────── */
function renderNav() {
  document.getElementById('dayNav').innerHTML = DAYS.map((d, i) =>
    `<button class="pt-db${i===currentDay?' active':''}${d.isRest?' rest':''}"
      onclick="${d.isRest?'':'setDay('+i+')'}"
      aria-label="${d.full}"
      ${d.isRest?'aria-disabled="true"':''}>${d.label}</button>`
  ).join('');
}
function setDay(d) {
  if (DAYS[d].isRest) return;
  currentDay = d;
  document.querySelectorAll('.pt-db').forEach((b, i) => b.classList.toggle('active', i === d));
  renderDay();
  document.getElementById('dayContent').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── RIR ──────────────────────────────────────────────────── */
function getRIRClass(v) {
  if (v <= 2) return 'sel-easy';
  if (v === 3) return 'sel-mod';
  if (v === 4) return 'sel-hard';
  return 'sel-max';
}
function addSession(dayKey, itemIdx, phase, val, btn) {
  const data = loadRIR();
  let session = 1;
  while (data[rirKey(dayKey, itemIdx, phase, session)] !== undefined) session++;
  data[rirKey(dayKey, itemIdx, phase, session)] = { rir: val, ts: Date.now() };
  saveRIR(data);
  const row = btn.closest('.pt-rir');
  row.querySelectorAll('.pt-rb').forEach(b => { b.className = 'pt-rb'; });
  btn.classList.add(getRIRClass(val));
  showToast(`${RIR_OPTS[val-1].label} registrado ✓`);
}

/* ── Render Day ───────────────────────────────────────────── */
function renderDay() {
  const day = DAYS[currentDay];
  const content = document.getElementById('dayContent');
  const data = loadRIR();

  if (day.isRest) {
    content.innerHTML = `
      <div class="pt-rest-card">
        <i class="ti ti-moon" aria-hidden="true"></i>
        <h3>Descanso completo</h3>
        <p>O domingo é o dia mais importante do programa.<br>Durante o repouso o organismo sintetiza proteínas musculares, reabastece o glicogênio e regula os hormônios anabólicos.</p>
      </div>`;
    return;
  }

  const bg = day.theme + '1A';
  let exCount = 0, stCount = 0;

  let html = `
    <div class="pt-dh" style="background:${bg}">
      <div class="pt-dot" style="background:${day.theme}"></div>
      <h2 style="color:${day.theme}">${day.full}<span>${day.subtitle}</span></h2>
    </div>
    <div class="pt-list">`;

  day.items.forEach((item, idx) => {
    if (item.type === 'ex') {
      exCount++;
      const num = exCount;

      let lastRIR = null, lastSession = 0;
      for (let s = 1; s <= 52; s++) {
        const v = data[rirKey(day.key, idx, currentPhase, s)];
        if (v !== undefined) { lastRIR = v.rir; lastSession = s; }
        else break;
      }

      const rirBtns = RIR_OPTS.map((r, ri) => {
        const v = ri + 1;
        const isSel = lastRIR === v;
        const cls = isSel ? ('pt-rb ' + getRIRClass(v)) : 'pt-rb';
        return `<button class="${cls}"
          onclick="addSession('${day.key}',${idx},${currentPhase},${v},this)"
          title="${r.sub}">${r.label}</button>`;
      }).join('');

      const sessionBadge = lastSession > 0
        ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto">S${lastSession}</span>` : '';

      const bisetBadge = item.biset
        ? `<div class="pt-biset-badge"><i class="ti ti-arrows-shuffle" aria-hidden="true" style="font-size:10px"></i> Bi-Set</div>` : '';
      const priorityBadge = item.priority
        ? `<div class="pt-priority-badge"><i class="ti ti-star-filled" aria-hidden="true" style="font-size:10px"></i> Prioridade Glúteo</div>` : '';

      const cardClass = item.biset ? 'pt-card biset-card' : 'pt-card';

      html += `
        <div class="${cardClass}">
          <div class="pt-card-main">
            <div class="pt-num" style="background:${day.theme}">${num}</div>
            <div class="pt-info">
              ${bisetBadge}${priorityBadge}
              <div class="pt-name">${item.name}</div>
              <div class="pt-presc">${item.phases[currentPhase]}</div>
            </div>
            <button class="pt-ib" onclick="openModal(${currentDay},${idx})" aria-label="Instruções de ${item.name}">
              <i class="ti ti-info-circle" aria-hidden="true"></i>
            </button>
          </div>
          <div class="pt-rir">
            <span class="pt-rir-label"><i class="ti ti-gauge" aria-hidden="true" style="font-size:12px"></i> RIR</span>
            <div class="pt-rir-btns">${rirBtns}</div>
            ${sessionBadge}
          </div>
        </div>`;
    } else {
      stCount++;
      html += `
        <div class="pt-card stretch-card">
          <div class="pt-card-main">
            <div class="pt-num stretch-num">${exCount + stCount}</div>
            <div class="pt-info">
              <div class="pt-name stretch-name"><i class="ti ti-leaf" aria-hidden="true" style="font-size:13px"></i> ${item.name}</div>
              <div class="pt-presc stretch-presc">${item.presc}</div>
            </div>
          </div>
        </div>`;
    }
  });

  html += `</div>`;
  content.innerHTML = html;
}

/* ── Photo data ───────────────────────────────────────────── */
const EXERCISE_PHOTOS = {
  'Agachamento Goblet com Halter':                [1552106,4162451,1581937,4162487],
  'Prancha Frontal no Solo + Variação':           [3076514,4164766,6455927,3775566],
  'Subida no Caixote com Halteres (Step-Up)':     [1552249,4162451,3838389,4164766],
  'Prancha Lateral + Elevação de Quadril (Hip Dip)':[4164766,6455927,3075549,3756165],
  'Polichinelo com Salto Controlado':             [1552106,3756165,4162487,3075549],
  'BI-SET 1A · Leg Press 45°':                    [1552106,4162451,3838389,3756165],
  'BI-SET 1B · Cadeira Extensora':                [3838389,1552249,4164766,3756165],
  'BI-SET 2A · Hip Thrust com Barra no Banco ★':  [4162487,3075549,1552249,6455927],
  'BI-SET 2B · Cadeira Flexora Sentada (Isquiotibiais)':[3838389,4162451,1552106,3756165],
  'BI-SET 3A · Stiff com Halteres':               [1552106,3838389,4162451,1552249],
  'BI-SET 3B · Cadeira Abdutora (Glúteo Médio)':  [4162487,1552249,3838389,1552106],
  'Panturrilha em Pé na Máquina':                 [1552249,3838389,4162451,1552106],
  'HIIT — Esteira Inclinada ou Elíptico':         [1552106,3756165,4162487,3075549],
  'Meio-Burpee (Sprawl) no Banco ou Solo':        [3075549,4164766,6455927,3838389],
  'Kettlebell Swing (Dobradiça de Quadril)':      [1552106,4162451,3756165,1581937],
  'Abdominal Bicicleta (Bicycle Crunch) ★':       [4164766,6455927,3075549,3838389],
  'Corrida Estacionária com Joelhos Altos':       [3075549,6455927,4164766,3756165],
  'BI-SET 1A · Puxada no Pulley Aberto':          [1552249,3838389,4162487,1552106],
  'BI-SET 1B · Supino Inclinado na Máquina (30–45°)':[1552106,1552249,3838389,4162451],
  'BI-SET 2A · Desenvolvimento com Halteres':     [4162487,1552249,3838389,1552106],
  'BI-SET 2B · Remada Triângulo no Cabo':         [1552106,3838389,4162451,1552249],
  'BI-SET 3A · Elevação Lateral com Halteres':    [4162487,1552249,3756165,1552106],
  'BI-SET 3B · Crucifixo Inverso na Máquina':     [1552249,4162487,3838389,1552106],
  'Super-Série: Tríceps Pulley + Rosca Direta':   [1552249,4162487,3838389,1552106],
  'Agachamento 1½ Rep com Halter (Pausa)':        [1552106,4162451,3756165,1581937],
  'Flexão de Braço no Solo (com Regressão)':      [3075549,4164766,6455927,3838389],
  'Passada Caminhando com Halteres (Walking Lunge)':[4162487,1552249,3756165,1552106],
  'Hip Thrust Unilateral no Banco ★ NOVO':        [4162487,3075549,1552249,6455927],
  'Abdominal Infra com Elevação de Quadril':      [6455927,4164766,3075549,3838389],
  'Mountain Climber (Alpinista) no Banco ou Solo':[3075549,6455927,4164766,1552249],
  'Mobilidade Articular Ativa (10 min)':          [3756165,3075549,4164766,6455927],
  'Foam Roller — Auto-massagem Miofascial':       [3756165,3075549,6455927,4164766],
  'Alongamento Estático Completo (20–30 min)':    [3756165,6455927,3075549,4164766],
  'Shavasana (relaxamento completo)':             [3756165,6455927,3075549,4164766],
};

const EXERCISE_SEARCH = {
  'Agachamento Goblet com Halter':                'goblet squat dumbbell',
  'Prancha Frontal no Solo + Variação':           'plank exercise core',
  'Subida no Caixote com Halteres (Step-Up)':     'step up dumbbell exercise',
  'Prancha Lateral + Elevação de Quadril (Hip Dip)':'side plank hip dip',
  'Polichinelo com Salto Controlado':             'jumping jacks exercise',
  'BI-SET 1A · Leg Press 45°':                    'leg press machine',
  'BI-SET 1B · Cadeira Extensora':                'leg extension machine',
  'BI-SET 2A · Hip Thrust com Barra no Banco ★':  'hip thrust barbell glutes',
  'BI-SET 2B · Cadeira Flexora Sentada (Isquiotibiais)':'seated leg curl',
  'BI-SET 3A · Stiff com Halteres':               'romanian deadlift dumbbell',
  'BI-SET 3B · Cadeira Abdutora (Glúteo Médio)':  'hip abductor machine',
  'Panturrilha em Pé na Máquina':                 'standing calf raise machine',
  'HIIT — Esteira Inclinada ou Elíptico':         'incline treadmill cardio',
  'Meio-Burpee (Sprawl) no Banco ou Solo':        'burpee exercise',
  'Kettlebell Swing (Dobradiça de Quadril)':      'kettlebell swing',
  'Abdominal Bicicleta (Bicycle Crunch) ★':       'bicycle crunch abs',
  'Corrida Estacionária com Joelhos Altos':       'high knees exercise',
  'BI-SET 1A · Puxada no Pulley Aberto':          'lat pulldown wide grip',
  'BI-SET 1B · Supino Inclinado na Máquina (30–45°)':'incline chest press',
  'BI-SET 2A · Desenvolvimento com Halteres':     'dumbbell shoulder press',
  'BI-SET 2B · Remada Triângulo no Cabo':         'cable row triangle',
  'BI-SET 3A · Elevação Lateral com Halteres':    'lateral raise dumbbell',
  'BI-SET 3B · Crucifixo Inverso na Máquina':     'reverse fly machine',
  'Super-Série: Tríceps Pulley + Rosca Direta':   'triceps pushdown biceps curl',
  'Agachamento 1½ Rep com Halter (Pausa)':        'pause squat dumbbell',
  'Flexão de Braço no Solo (com Regressão)':      'push up exercise',
  'Passada Caminhando com Halteres (Walking Lunge)':'walking lunge dumbbell',
  'Hip Thrust Unilateral no Banco ★ NOVO':        'single leg hip thrust',
  'Abdominal Infra com Elevação de Quadril':      'reverse crunch exercise',
  'Mountain Climber (Alpinista) no Banco ou Solo':'mountain climber exercise',
  'Mobilidade Articular Ativa (10 min)':          'joint mobility exercise',
  'Foam Roller — Auto-massagem Miofascial':       'foam roller myofascial',
  'Alongamento Estático Completo (20–30 min)':    'full body stretching',
  'Shavasana (relaxamento completo)':             'savasana relaxation yoga',
};

const photoCache = {};
let currentModalItem = null;

/* ── Modal ────────────────────────────────────────────────── */
function openModal(dayIdx, itemIdx) {
  const item = DAYS[dayIdx].items[itemIdx];
  const day  = DAYS[dayIdx];
  currentModalItem = item;
  document.getElementById('modalTitle').textContent        = item.name;
  document.getElementById('modalPrescription').textContent = item.phases[currentPhase];
  document.getElementById('modalInstrucoes').textContent   = item.instrucoes;
  document.getElementById('modalHeader').style.background  = day.theme;
  document.getElementById('photoContainer').innerHTML = `
    <div class="pt-photo-loading">
      <i class="ti ti-photo-search" aria-hidden="true"></i>
      <p>Buscando foto…</p>
    </div>`;
  switchModalTab('instrucoes');
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(e) { if (e.target === document.getElementById('modalBackdrop')) closeModalDirect(); }
function closeModalDirect() {
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function switchModalTab(tab) {
  ['instrucoes','foto'].forEach(t => document.getElementById('mtab-'+t).classList.toggle('hidden', t !== tab));
  document.querySelectorAll('.pt-tbt').forEach((b, i) => b.classList.toggle('active', ['instrucoes','foto'][i] === tab));
  if (tab === 'foto' && currentModalItem) loadExercisePhotos(currentModalItem.name);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalDirect(); });

/* ── Photos ───────────────────────────────────────────────── */
function loadExercisePhotos(name) {
  const container = document.getElementById('photoContainer');
  if (photoCache[name]) { renderPhotos(container, name, photoCache[name]); return; }
  const ids = EXERCISE_PHOTOS[name] || [1552106, 4162451, 3838389, 3756165];
  const photos = ids.map(id => ({
    url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1`,
  }));
  photoCache[name] = photos;
  renderPhotos(container, name, photos);
}
function renderPhotos(container, name, photos) {
  const q = EXERCISE_SEARCH[name] || name;
  const gridItems = photos.map(p => `
    <div class="pt-photo-item">
      <img src="${p.url}" alt="Foto do exercício" loading="lazy" data-loading="true"
        onload="this.removeAttribute('data-loading')"
        onerror="this.closest('.pt-photo-item').style.display='none'" />
    </div>`).join('');
  container.innerHTML = `
    <div class="pt-photo-grid">${gridItems}</div>
    <div class="pt-photo-actions">
      <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}" target="_blank" rel="noopener" class="pt-photo-link">
        <i class="ti ti-search" aria-hidden="true"></i> Google
      </a>
      <a href="https://www.pexels.com/search/${encodeURIComponent(q)}/" target="_blank" rel="noopener" class="pt-photo-link">
        <i class="ti ti-photo" aria-hidden="true"></i> Pexels
      </a>
    </div>
    <p class="pt-photo-credit">Fotos: <a href="https://www.pexels.com" target="_blank" rel="noopener">Pexels</a> — licença gratuita</p>`;
}

/* ── Evolução ─────────────────────────────────────────────── */
function getAllExercises() {
  const list = [];
  DAYS.forEach((d, di) => {
    if (d.isRest) return;
    d.items.forEach((item, ii) => {
      if (item.type === 'ex') list.push({ dayIdx: di, itemIdx: ii, label: `[${d.label}] ${item.name}` });
    });
  });
  return list;
}
function populateEvoSelect() {
  const sel = document.getElementById('evoSelect');
  sel.innerHTML = getAllExercises().map((e, i) => `<option value="${i}">${e.label}</option>`).join('');
}
function renderEvo() {
  const sel  = document.getElementById('evoSelect');
  const idx  = parseInt(sel.value || '0');
  const exes = getAllExercises();
  if (!exes.length) return;
  const ex     = exes[idx];
  const dayObj = DAYS[ex.dayIdx];
  const data   = loadRIR();
  const content = document.getElementById('evoContent');
  const PHASE_COLORS = ['#8B1A4A', '#9C4DA0', '#1B6B5A'];
  const MAX_SESSIONS = 13;

  const datasets = [0,1,2].map(ph => {
    const pts = [];
    for (let s = 1; s <= MAX_SESSIONS; s++) {
      const v = data[rirKey(dayObj.key, ex.itemIdx, ph, s)];
      pts.push(v !== undefined ? v.rir : null);
    }
    return {
      label: `Fase ${ph+1}`, data: pts,
      borderColor: PHASE_COLORS[ph], backgroundColor: PHASE_COLORS[ph]+'30',
      pointBackgroundColor: PHASE_COLORS[ph],
      pointRadius: pts.map(v => v !== null ? 5 : 0),
      tension: 0.3, spanGaps: false,
    };
  });

  const hasData = datasets.some(ds => ds.data.some(v => v !== null));

  content.innerHTML = `
    <div class="pt-chart-wrap">
      <div class="pt-chart-title">Esforço percebido — ${dayObj.items[ex.itemIdx].name}</div>
      <canvas id="evoCanvas" height="220"></canvas>
      <div class="pt-legend">
        ${PHASE_COLORS.map((c,i) => `<div class="pt-leg-item"><div class="pt-leg-dot" style="background:${c}"></div>Fase ${i+1}</div>`).join('')}
      </div>
    </div>
    <div class="pt-chart-wrap">
      <div class="pt-chart-title">Escala de referência RIR</div>
      <div class="pt-rir-scale">
        ${RIR_OPTS.map(r => `
          <div class="pt-rir-scale-item">
            <div class="pt-rir-scale-dot" style="background:${r.color}"></div>
            <span style="font-size:12px;font-weight:500;min-width:48px;color:var(--text-primary)">${r.label}</span>
            <span style="font-size:12px;color:var(--text-secondary)">${r.sub}</span>
          </div>`).join('')}
      </div>
    </div>
    ${!hasData ? `<div class="pt-evo-empty"><i class="ti ti-chart-line" aria-hidden="true"></i>Ainda sem registros para este exercício.<br>Registre o RIR no treino para ver a evolução aqui.</div>` : ''}`;

  if (evoChart) { evoChart.destroy(); evoChart = null; }
  evoChart = new Chart(document.getElementById('evoCanvas').getContext('2d'), {
    type: 'line',
    data: { labels: Array.from({length:MAX_SESSIONS},(_,i)=>`S${i+1}`), datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => {
          const v = ctx.parsed.y;
          if (!v) return '';
          return `${ctx.dataset.label}: ${RIR_OPTS[v-1]?.label} — ${RIR_OPTS[v-1]?.sub}`;
        }}},
      },
      scales: {
        y: { min:0, max:6, ticks:{ stepSize:1, callback: v => (v>=1&&v<=5)?RIR_OPTS[v-1]?.label:'' }, grid:{color:'rgba(128,128,128,0.15)'} },
        x: { grid:{color:'rgba(128,128,128,0.1)'} },
      },
    },
  });
}

/* ── Init ─────────────────────────────────────────────────── */
renderNav();
renderDay();

/* ── Service Worker ───────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.warn('SW error:', err));
  });
}
