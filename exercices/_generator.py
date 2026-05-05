#!/usr/bin/env python3
"""
Generator for the 13 interactive HTML exercises (cours pensee computationnelle 9e CO).
Run from any cwd:  python3 _generator.py
Outputs 13 .html files + INDEX.md as siblings of this script.
"""
import json
from pathlib import Path

OUT_DIR = Path(__file__).parent

# ---------- HTML TEMPLATE (one shared template, three modes) ----------
TEMPLATE = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #F4F6F8;
    --primary: #002E47;
    --accent: #e91d63;
    --accent2: #00b4d8;
    --success: #16a34a;
    --error: #dc2626;
    --code-bg: #ffffff;
    --code-border: #001c2e;
    --kw: #7c3aed;
    --fn: #1d4ed8;
    --num: #ca8a04;
    --str: #16a34a;
    --op: #dc2626;
    --slot-bg: #fffaf0;
    --slot-border: #ca8a04;
    --token-bg: #e8f4fd;
    --token-border: #90caf9;
    --shadow: 0 4px 16px rgba(0,46,71,0.08);
  }
  body { font-family: 'Inter', sans-serif; background: var(--bg); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 0 0 32px 0; }
  .app-header { width: 100%; background: var(--primary); padding: 16px 20px 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .app-header h1 { font-size: 1.05rem; font-weight: 800; color: white; text-align: center; letter-spacing: -0.2px; }
  .app-header p { font-size: 0.75rem; color: #90caf9; font-weight: 400; }
  .progress-container { width: 100%; max-width: 480px; padding: 16px 20px 0; }
  .progress-label { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .progress-label span { font-size: 0.75rem; font-weight: 600; color: var(--primary); }
  .round-badge { background: var(--primary); color: white; border-radius: 20px; padding: 2px 12px; font-size: 0.72rem; font-weight: 700; }
  .progress-bar-wrap { background: #dde8f0; border-radius: 100px; height: 6px; overflow: hidden; }
  .progress-bar-fill { background: linear-gradient(90deg, var(--accent2), var(--primary)); height: 100%; border-radius: 100px; transition: width 0.6s; }
  .step-dots { display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
  .step-dot { width: 28px; height: 6px; border-radius: 100px; background: #dde8f0; transition: background 0.3s; }
  .step-dot.active { background: var(--accent2); transform: scaleY(1.3); }
  .step-dot.done { background: var(--success); }
  .main-card { width: 100%; max-width: 480px; background: white; border-radius: 14px; box-shadow: var(--shadow); margin: 14px 20px 0; padding: 20px 18px 18px; }
  .instruction-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 14px; }
  .instruction-icon { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--primary), var(--accent2)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 1rem; }
  .instruction-text h2 { font-size: 0.9rem; font-weight: 700; color: var(--primary); line-height: 1.3; margin-bottom: 2px; }
  .instruction-text p { font-size: 0.78rem; color: #666; line-height: 1.45; }
  .code-block { background: var(--code-bg); border: 2.5px solid var(--code-border); border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; font-family: 'Courier New', monospace; font-size: 0.86rem; line-height: 2.0; color: #111; }
  .code-line { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; min-height: 30px; }
  .code-keyword { color: var(--kw); font-weight: 700; }
  .code-fn      { color: var(--fn); font-weight: 600; }
  .code-num     { color: var(--num); font-weight: 700; }
  .code-str     { color: var(--str); font-weight: 600; }
  .code-op      { color: var(--op); font-weight: 700; }
  .code-var     { color: #111; }
  .code-comment { color: #888; font-style: italic; font-size: 0.78rem; }
  .drop-slot { display: inline-flex; align-items: center; justify-content: center; min-width: 90px; height: 30px; background: var(--slot-bg); border: 2px dashed var(--slot-border); border-radius: 6px; padding: 0 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; font-weight: 700; color: transparent; cursor: pointer; user-select: none; transition: all 0.15s; }
  .drop-slot.dragover { background: rgba(202,138,4,0.18); transform: scale(1.05); }
  .drop-slot.filled { color: var(--num); border-style: solid; }
  .drop-slot.correct { color: var(--success); border-color: var(--success); background: rgba(22,163,74,0.12); }
  .drop-slot.incorrect { color: var(--error); border-color: var(--error); background: rgba(220,38,38,0.12); animation: shake 0.4s; }
  .drop-slot--line { display: flex; width: 100%; min-height: 32px; height: auto; justify-content: flex-start; padding: 6px 10px; font-size: 0.82rem; }
  .drop-slot--line.filled { color: #111; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
  .tokens-label { font-size: 0.72rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; }
  .tokens-area { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; min-height: 44px; }
  .token { display: inline-flex; align-items: center; justify-content: center; padding: 6px 14px; background: var(--token-bg); border: 2px solid var(--token-border); border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; font-weight: 700; color: var(--primary); cursor: grab; user-select: none; touch-action: none; transition: all 0.15s; }
  .token:hover { background: #d0eaf9; transform: translateY(-2px); }
  .token.dragging { opacity: 0.4; }
  .token.used { opacity: 0.3; pointer-events: none; }
  .token--line { width: 100%; justify-content: flex-start; padding: 7px 12px; font-size: 0.82rem; }
  .feedback-box { border-radius: 10px; padding: 11px 13px; font-size: 0.8rem; line-height: 1.5; margin-bottom: 12px; display: none; align-items: flex-start; gap: 8px; }
  .feedback-box.show { display: flex; }
  .feedback-box.success { background: #dcfce7; border: 1.5px solid #86efac; color: #166534; }
  .feedback-box.error   { background: #fee2e2; border: 1.5px solid #fca5a5; color: #991b1b; }
  .feedback-box .fb-strong { font-weight: 800; margin-right: 4px; }
  .btn { width: 100%; padding: 12px; border: none; border-radius: 9px; font-family: 'Inter', sans-serif; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .btn-check { background: var(--primary); color: white; }
  .btn-check:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-next  { background: linear-gradient(135deg, var(--primary), var(--accent2)); color: white; display: none; margin-top: 8px; }
  .btn-next.show { display: block; }
  .completion { width: 100%; max-width: 480px; background: white; border-radius: 14px; box-shadow: var(--shadow); margin: 14px 20px 0; padding: 28px 22px; text-align: center; display: none; }
  .completion.show { display: block; }
  .trophy { font-size: 2.4rem; margin-bottom: 10px; }
  .completion h2 { font-size: 1.15rem; color: var(--primary); margin-bottom: 6px; }
  .completion p  { font-size: 0.82rem; color: #666; margin-bottom: 16px; }
  .drag-ghost { position: fixed; pointer-events: none; z-index: 9999; padding: 6px 14px; background: var(--primary); color: white; border-radius: 8px; font-family: 'Courier New', monospace; font-weight: 700; transform: translate(-50%, -50%) rotate(2deg); display: none; max-width: 380px; }
  /* Trace table (sec 5) */
  .trace-table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 14px; }
  .trace-table th, .trace-table td { border: 1.2px solid #555; padding: 8px 10px; font-size: 0.85rem; text-align: center; }
  .trace-table th { background: var(--primary); color: white; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.4px; }
  .trace-table td:first-child { font-family: 'Courier New', monospace; font-weight: 700; background: #fafafa; width: 38%; }
  /* Construction zone (sec 6) */
  .construction-zone { background: #fafafa; border: 2.5px dashed var(--code-border); border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; min-height: 200px; display: flex; flex-direction: column; gap: 6px; font-family: 'Courier New', monospace; }
  .construction-zone .order-label { font-family: 'Inter', sans-serif; font-size: 0.7rem; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 4px; }
  .construction-row { display: flex; align-items: center; gap: 8px; }
  .row-num { font-family: 'Inter', sans-serif; font-size: 0.72rem; color: #888; font-weight: 700; min-width: 18px; }
</style>
</head>
<body>

<div class="app-header">
  <h1>__HEADER_H1__</h1>
  <p>__HEADER_SUB__</p>
</div>

<div class="progress-container">
  <div class="progress-label">
    <span>Ta progression</span>
    <span class="round-badge" id="roundBadge">Manche 1 / 3</span>
  </div>
  <div class="progress-bar-wrap"><div class="progress-bar-fill" id="progressBar" style="width:0%"></div></div>
  <div class="step-dots">
    <div class="step-dot active" id="dot0"></div>
    <div class="step-dot" id="dot1"></div>
    <div class="step-dot" id="dot2"></div>
  </div>
</div>

<div class="main-card" id="mainCard">
  <div class="instruction-row">
    <div class="instruction-icon">__ICON__</div>
    <div class="instruction-text">
      <h2 id="roundTitle"></h2>
      <p id="roundDesc"></p>
    </div>
  </div>
  <div id="exerciseArea"></div>
  <div class="tokens-label" id="tokensLabel">__TOKENS_LABEL__</div>
  <div class="tokens-area" id="tokensArea"></div>
  <div class="feedback-box" id="feedbackBox">
    <span id="feedbackIcon"></span>
    <div id="feedbackText"></div>
  </div>
  <button class="btn btn-check" id="btnCheck" onclick="checkAnswer()" disabled>Verifier ma reponse</button>
  <button class="btn btn-next"  id="btnNext"  onclick="nextRound()">Manche suivante &rarr;</button>
</div>

<div class="completion" id="completionScreen">
  <div class="trophy">&#127942;</div>
  <h2>Bravo, tu as termine !</h2>
  <p id="completionMessage"></p>
  <button class="btn btn-next show" onclick="restartGame()">&#128260; Recommencer</button>
</div>

<div class="drag-ghost" id="dragGhost"></div>

<script>
const rounds = __ROUNDS_JSON__;
const completionMsg = __COMPLETION_MSG__;
const interactionCode = __INTERACTION_CODE__;

let currentRound = 0;
let filledSlots = {};
let attempts = 0;

function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function init() {
  currentRound = 0; filledSlots = {}; attempts = 0;
  document.getElementById('completionScreen').classList.remove('show');
  document.getElementById('mainCard').style.display = '';
  updateProgress(); renderRound();
}

function updateProgress() {
  const pct = (currentRound / rounds.length) * 100;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('roundBadge').textContent = 'Manche ' + Math.min(currentRound+1, rounds.length) + ' / ' + rounds.length;
  for (let i = 0; i < rounds.length; i++) {
    const dot = document.getElementById('dot' + i);
    if (!dot) continue;
    dot.className = 'step-dot';
    if (i < currentRound) dot.classList.add('done');
    else if (i === currentRound) dot.classList.add('active');
  }
}

function renderRound() {
  const r = rounds[currentRound];
  filledSlots = {}; attempts = 0;
  document.getElementById('roundTitle').textContent = r.title;
  document.getElementById('roundDesc').textContent = r.description;

  const area = document.getElementById('exerciseArea');
  clearChildren(area);

  if (r.mode === 'order') {
    const cz = document.createElement('div');
    cz.className = 'construction-zone';
    const lbl = document.createElement('div');
    lbl.className = 'order-label';
    lbl.textContent = 'Glisse les lignes dans le bon ordre :';
    cz.appendChild(lbl);
    r.slots.forEach((s, idx) => {
      const row = document.createElement('div');
      row.className = 'construction-row';
      const num = document.createElement('div');
      num.className = 'row-num';
      num.textContent = (idx+1) + '.';
      row.appendChild(num);
      row.appendChild(makeSlot(s.id, true));
      cz.appendChild(row);
    });
    area.appendChild(cz);
  } else {
    const cb = document.createElement('div');
    cb.className = 'code-block';
    if (r.codeLines) {
      r.codeLines.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'code-line';
        line.parts.forEach(part => {
          if (part.type === 'slot') {
            lineDiv.appendChild(makeSlot(part.id, false));
          } else if (part.type === 'comment') {
            const span = document.createElement('span');
            span.className = 'code-comment';
            span.textContent = part.value;
            lineDiv.appendChild(span);
          } else {
            const span = document.createElement('span');
            const cls = {kw:'code-keyword', fn:'code-fn', num:'code-num', str:'code-str', op:'code-op', var:'code-var'}[part.type] || '';
            if (cls) span.className = cls;
            span.textContent = part.value;
            lineDiv.appendChild(span);
          }
        });
        cb.appendChild(lineDiv);
      });
    }
    area.appendChild(cb);

    if (r.traceTable) {
      const tbl = document.createElement('table');
      tbl.className = 'trace-table';
      const thead = document.createElement('thead');
      const trh = document.createElement('tr');
      r.traceTable.headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      tbl.appendChild(thead);
      const tbody = document.createElement('tbody');
      r.traceTable.rows.forEach(row => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = row.input;
        tr.appendChild(td1);
        const td2 = document.createElement('td');
        td2.appendChild(makeSlot(row.slotId, false));
        tr.appendChild(td2);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      area.appendChild(tbl);
    }
  }

  // Tokens
  const ta = document.getElementById('tokensArea');
  clearChildren(ta);
  r.tokens.forEach((tok, i) => {
    const div = document.createElement('div');
    div.className = 'token' + (r.mode === 'order' ? ' token--line' : '');
    div.textContent = tok;
    div.draggable = true;
    div.dataset.value = tok;
    div.dataset.tokenIndex = i;
    div.addEventListener('dragstart', e => onDragStart(e, tok, div));
    div.addEventListener('dragend', onDragEnd);
    div.addEventListener('touchstart', e => onTouchStart(e, tok, div), { passive: false });
    div.addEventListener('touchmove',  onTouchMove,  { passive: false });
    div.addEventListener('touchend',   onTouchEnd,   { passive: false });
    ta.appendChild(div);
  });

  document.getElementById('feedbackBox').className = 'feedback-box';
  document.getElementById('btnCheck').style.display = '';
  document.getElementById('btnCheck').disabled = true;
  document.getElementById('btnNext').classList.remove('show');
}

function makeSlot(id, isLine) {
  const slot = document.createElement('span');
  slot.className = 'drop-slot' + (isLine ? ' drop-slot--line' : '');
  slot.id = id;
  slot.dataset.slot = id;
  slot.addEventListener('dragover', onDragOver);
  slot.addEventListener('dragleave', onDragLeave);
  slot.addEventListener('drop', e => onDrop(e, id));
  slot.addEventListener('click', () => removeFromSlot(id));
  return slot;
}

let dragToken = null, dragTokenEl = null, touchToken = null;
function onDragStart(e, value, el) {
  dragToken = value; dragTokenEl = el;
  el.classList.add('dragging');
  e.dataTransfer.setData('text/plain', value);
  e.dataTransfer.effectAllowed = 'move';
}
function onDragEnd() { if (dragTokenEl) dragTokenEl.classList.remove('dragging'); dragToken = null; dragTokenEl = null; }
function onDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('dragover'); }
function onDragLeave(e) { e.currentTarget.classList.remove('dragover'); }
function onDrop(e, slotId) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  const value = e.dataTransfer.getData('text/plain') || dragToken;
  if (value) fillSlot(slotId, value);
}
function onTouchStart(e, value, el) {
  e.preventDefault();
  touchToken = { value, el };
  const t = e.touches[0];
  const ghost = document.getElementById('dragGhost');
  ghost.textContent = value;
  ghost.style.display = 'block';
  ghost.style.left = t.clientX + 'px';
  ghost.style.top = t.clientY + 'px';
  el.classList.add('dragging');
}
function onTouchMove(e) {
  if (!touchToken) return;
  e.preventDefault();
  const t = e.touches[0];
  const ghost = document.getElementById('dragGhost');
  ghost.style.left = t.clientX + 'px';
  ghost.style.top = t.clientY + 'px';
  document.querySelectorAll('.drop-slot').forEach(s => s.classList.remove('dragover'));
  const el = document.elementFromPoint(t.clientX, t.clientY);
  if (el) {
    const slotEl = el.closest('.drop-slot');
    if (slotEl) slotEl.classList.add('dragover');
  }
}
function onTouchEnd(e) {
  if (!touchToken) return;
  document.getElementById('dragGhost').style.display = 'none';
  const t = e.changedTouches[0];
  const el = document.elementFromPoint(t.clientX, t.clientY);
  document.querySelectorAll('.drop-slot').forEach(s => s.classList.remove('dragover'));
  if (el) {
    const slot = el.closest('.drop-slot');
    if (slot) fillSlot(slot.dataset.slot, touchToken.value);
  }
  touchToken.el.classList.remove('dragging');
  touchToken = null;
}
function fillSlot(slotId, value) {
  const r = rounds[currentRound];
  if (!r.slots.find(s => s.id === slotId)) return;
  if (filledSlots[slotId]) returnToken(filledSlots[slotId], slotId);
  filledSlots[slotId] = value;
  let claimed = false;
  document.querySelectorAll('.token').forEach(t => {
    if (!claimed && t.dataset.value === value && !t.classList.contains('used')) {
      t.classList.add('used'); t._usedFor = slotId; claimed = true;
    }
  });
  const slotEl = document.getElementById(slotId);
  slotEl.classList.remove('correct', 'incorrect');
  slotEl.classList.add('filled');
  slotEl.textContent = value;
  document.getElementById('btnCheck').disabled = !r.slots.every(s => filledSlots[s.id]);
}
function removeFromSlot(slotId) {
  if (!filledSlots[slotId]) return;
  returnToken(filledSlots[slotId], slotId);
  delete filledSlots[slotId];
  const slotEl = document.getElementById(slotId);
  slotEl.className = 'drop-slot' + (rounds[currentRound].mode === 'order' ? ' drop-slot--line' : '');
  slotEl.textContent = '';
  document.getElementById('btnCheck').disabled = true;
}
function returnToken(value, forSlot) {
  let released = false;
  document.querySelectorAll('.token').forEach(t => {
    if (!released && t.dataset.value === value && t._usedFor === forSlot) {
      t.classList.remove('used'); delete t._usedFor; released = true;
    }
  });
  if (!released) {
    document.querySelectorAll('.token').forEach(t => {
      if (!released && t.dataset.value === value && t.classList.contains('used')) {
        t.classList.remove('used'); delete t._usedFor; released = true;
      }
    });
  }
}
function setFeedback(kind, headline, body) {
  const fb = document.getElementById('feedbackBox');
  fb.className = 'feedback-box ' + kind + ' show';
  document.getElementById('feedbackIcon').textContent = (kind === 'success') ? '✅' : '❌';
  const ft = document.getElementById('feedbackText');
  clearChildren(ft);
  const strong = document.createElement('span');
  strong.className = 'fb-strong';
  strong.textContent = headline;
  ft.appendChild(strong);
  ft.appendChild(document.createTextNode(' ' + body));
}
function checkAnswer() {
  attempts++;
  const r = rounds[currentRound];
  let allOk = true;
  r.slots.forEach(s => {
    const el = document.getElementById(s.id);
    if (filledSlots[s.id] === s.correct) el.classList.add('correct');
    else { allOk = false; el.classList.remove('correct'); el.classList.add('incorrect'); }
  });
  if (allOk) {
    setFeedback('success', 'Bonne reponse !', r.feedbackOk);
    document.getElementById('btnCheck').style.display = 'none';
    document.getElementById('btnNext').classList.add('show');
  } else {
    setFeedback('error', 'Pas tout a fait...', r.feedbackKo);
    setTimeout(() => {
      r.slots.forEach(s => {
        if (filledSlots[s.id] !== s.correct) {
          returnToken(filledSlots[s.id], s.id);
          delete filledSlots[s.id];
          const el = document.getElementById(s.id);
          el.className = 'drop-slot' + (rounds[currentRound].mode === 'order' ? ' drop-slot--line' : '');
          el.textContent = '';
        }
      });
      document.getElementById('btnCheck').disabled = !r.slots.every(s => filledSlots[s.id]);
    }, 900);
  }
}
function nextRound() {
  currentRound++;
  if (currentRound >= rounds.length) { showCompletion(); return; }
  updateProgress(); renderRound();
}
function showCompletion() {
  document.getElementById('mainCard').style.display = 'none';
  document.getElementById('completionScreen').classList.add('show');
  document.getElementById('completionMessage').textContent = completionMsg;
  document.getElementById('progressBar').style.width = '100%';
  document.getElementById('roundBadge').textContent = 'Termine !';
  document.querySelectorAll('.step-dot').forEach(d => d.className = 'step-dot done');
}
function restartGame() { init(); }

init();

function adjustIframeHeight() {
  const height = document.body.scrollHeight;
  window.parent.postMessage({
    interactionCode: interactionCode,
    type: 'SET_INSTRUCTION_HEIGHT',
    value: height
  }, '*');
}
window.addEventListener('load', adjustIframeHeight);
window.addEventListener('resize', adjustIframeHeight);
setInterval(adjustIframeHeight, 1000);
</script>
</body>
</html>
"""

# ---------- Helpers to build codeLines parts ----------
def kw(v): return {"type":"kw","value":v}
def fn(v): return {"type":"fn","value":v}
def num(v): return {"type":"num","value":v}
def st(v): return {"type":"str","value":v}
def op(v): return {"type":"op","value":v}
def vr(v): return {"type":"var","value":v}
def tx(v): return {"type":"text","value":v}
def cmt(v): return {"type":"comment","value":v}
def slot(i): return {"type":"slot","id":i}
def line(*parts): return {"parts": list(parts)}

IND = "  "

EXERCISES = []

# --- s1_03 ---
EXERCISES.append({
  "slug": "s1_03_fonctions_base",
  "title": "Fonctions de base",
  "header_h1": "Fonctions du robot",
  "header_sub": "Reconnaitre et appeler les actions",
  "icon": "🤖",
  "interaction_code": "mcg_codage_s1_03_fonctions_base",
  "concept": "Reconnaitre les fonctions d'action du robot.",
  "completion_msg": "Tu sais maintenant identifier et appeler les fonctions d'action du robot. Continue comme ca !",
  "rounds": [
    {
      "title": "Manche 1 : Avance d'un pas",
      "description": "Le robot doit avancer d'un pas. Choisis la bonne fonction.",
      "codeLines": [
        line(cmt("# Le robot doit avancer d'un pas")),
        line(slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"avancer()"}],
      "tokens": ["avancer()", "reculer()", "s_arreter()", "tourner_droite()"],
      "feedbackOk": "Les parentheses () indiquent qu'on appelle (utilise) la fonction.",
      "feedbackKo": "Cherche la fonction qui fait progresser le robot vers l'avant.",
    },
    {
      "title": "Manche 2 : Tourne puis avance",
      "description": "Le robot doit pivoter a droite, puis avancer.",
      "codeLines": [
        line(cmt("# Tourne a droite, puis avance")),
        line(slot("slot1")),
        line(slot("slot2")),
      ],
      "slots": [
        {"id":"slot1","correct":"tourner_droite()"},
        {"id":"slot2","correct":"avancer()"}
      ],
      "tokens": ["avancer()", "reculer()", "tourner_droite()", "tourner_gauche()", "s_arreter()"],
      "feedbackOk": "L'ordre des instructions compte : d'abord changer de direction, ensuite avancer.",
      "feedbackKo": "Le robot doit d'abord changer de direction, puis avancer dans la nouvelle direction.",
    },
    {
      "title": "Manche 3 : Demi-tour a gauche",
      "description": "Pour faire demi-tour vers la gauche, le robot doit tourner deux fois.",
      "codeLines": [
        line(cmt("# Demi-tour : deux quarts de tour a gauche")),
        line(slot("slot1")),
        line(slot("slot2")),
      ],
      "slots": [
        {"id":"slot1","correct":"tourner_gauche()"},
        {"id":"slot2","correct":"tourner_gauche()"}
      ],
      "tokens": ["tourner_gauche()", "tourner_gauche()", "tourner_droite()", "avancer()", "s_arreter()"],
      "feedbackOk": "Un demi-tour = deux quarts de tour dans le meme sens.",
      "feedbackKo": "Un demi-tour a gauche, c'est combien de quarts de tour a gauche ?",
    },
  ]
})

# --- s1_04 ---
EXERCISES.append({
  "slug": "s1_04_thymio_to_code",
  "title": "Du Thymio au pseudo-code",
  "header_h1": "Traduire Thymio en code",
  "header_sub": "Evenements -> instructions",
  "icon": "🔁",
  "interaction_code": "mcg_codage_s1_04_thymio_to_code",
  "concept": "Traduire un evenement Thymio (bouton ou capteur) en code.",
  "completion_msg": "Tu sais relier les evenements de Thymio (boutons, capteurs) a des instructions de code. Excellent !",
  "rounds": [
    {
      "title": "Manche 1 : Bouton AVANT",
      "description": "Quand on appuie sur le bouton AVANT, le robot doit avancer.",
      "codeLines": [
        line(cmt("# Quand on appuie sur AVANT")),
        line(kw("si"), tx(" "), vr("bouton_avant"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"avancer()"}],
      "tokens": ["avancer()", "reculer()", "s_arreter()", "tourner_droite()"],
      "feedbackOk": "Comme dans Thymio VPL : un evenement (bouton presse) declenche une action.",
      "feedbackKo": "Quand on appuie sur AVANT, qu'attend-on logiquement du robot ?",
    },
    {
      "title": "Manche 2 : Capteur d'obstacle",
      "description": "Quand le capteur avant detecte un obstacle, le robot doit reculer.",
      "codeLines": [
        line(cmt("# Obstacle detecte devant")),
        line(kw("si"), tx(" "), fn("obstacle_devant()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"reculer()"}],
      "tokens": ["reculer()", "avancer()", "tourner_droite()", "s_arreter()"],
      "feedbackOk": "Le capteur declenche une reaction qui protege le robot du choc.",
      "feedbackKo": "Si quelque chose te bloque le passage, tu y rentres dedans ou tu t'eloignes ?",
    },
    {
      "title": "Manche 3 : Bouton CENTRAL",
      "description": "Le bouton CENTRAL sert a arreter le programme proprement.",
      "codeLines": [
        line(cmt("# Bouton CENTRAL = arret")),
        line(kw("si"), tx(" "), vr("bouton_central"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"s_arreter()"}],
      "tokens": ["s_arreter()", "avancer()", "reculer()", "tourner_droite()"],
      "feedbackOk": "Le bouton central de Thymio est l'arret d'urgence : utile pour stopper proprement.",
      "feedbackKo": "Quelle action met fin au mouvement du robot ?",
    },
  ]
})

# --- s2_03 ---
EXERCISES.append({
  "slug": "s2_03_operateurs",
  "title": "Operateurs de comparaison",
  "header_h1": "Operateurs de comparaison",
  "header_sub": "<, >, =, ≤, ≥",
  "icon": "⚖️",
  "interaction_code": "mcg_codage_s2_03_operateurs",
  "concept": "Choisir le bon operateur de comparaison selon la situation.",
  "completion_msg": "Tu maitrises les operateurs de comparaison. Ces symboles sont la base de toutes les conditions.",
  "rounds": [
    {
      "title": "Manche 1 : Plus petit que",
      "description": "Si la temperature est sous 18 degres, on affiche \"froid\".",
      "codeLines": [
        line(cmt("# Detecte le froid")),
        line(kw("si"), tx(" "), vr("temperature"), tx(" "), slot("slot1"), tx(" "), num("18"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), st("\"froid\""), tx(")")),
      ],
      "slots": [{"id":"slot1","correct":"<"}],
      "tokens": ["<", ">", "=", "≤", "≥"],
      "feedbackOk": "L'operateur < (strictement inferieur) est vrai quand la valeur est en-dessous du seuil.",
      "feedbackKo": "On veut detecter une temperature EN-DESSOUS de 18. Quel symbole signifie 'plus petit que' ?",
    },
    {
      "title": "Manche 2 : Atteindre 10 ou plus",
      "description": "Si le compteur atteint 10 ou plus, c'est gagne.",
      "codeLines": [
        line(cmt("# Victoire a partir de 10")),
        line(kw("si"), tx(" "), vr("compteur"), tx(" "), slot("slot1"), tx(" "), num("10"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), st("\"gagne\""), tx(")")),
      ],
      "slots": [{"id":"slot1","correct":"≥"}],
      "tokens": ["<", ">", "=", "≤", "≥"],
      "feedbackOk": "≥ signifie 'superieur OU egal' : 10, 11, 12... font tous gagner.",
      "feedbackKo": "Attention au mot 'ou plus' : 10 doit AUSSI declencher la victoire, pas seulement 11+.",
    },
    {
      "title": "Manche 3 : Exactement zero",
      "description": "Si la distance est exactement 0, le robot s'arrete.",
      "codeLines": [
        line(cmt("# Stop quand on touche")),
        line(kw("si"), tx(" "), fn("distance()"), tx(" "), slot("slot1"), tx(" "), num("0"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("s_arreter()")),
      ],
      "slots": [{"id":"slot1","correct":"="}],
      "tokens": ["<", ">", "=", "≤", "≥"],
      "feedbackOk": "Le symbole = teste l'egalite parfaite.",
      "feedbackKo": "On veut tester l'egalite exacte avec 0. Quel symbole exprime 'egal a' ?",
    },
  ]
})

# --- s2_04 ---
EXERCISES.append({
  "slug": "s2_04_si_simple",
  "title": "Construire un SI",
  "header_h1": "La condition SI",
  "header_sub": "Reagir a une situation",
  "icon": "❓",
  "interaction_code": "mcg_codage_s2_04_si_simple",
  "concept": "Construire une condition SI complete : capteur + action.",
  "completion_msg": "Tu sais construire un SI complet : un capteur (qui renvoie vrai/faux) declenche une action.",
  "rounds": [
    {
      "title": "Manche 1 : L'action du SI",
      "description": "Si un obstacle apparait, le robot doit tourner.",
      "codeLines": [
        line(kw("si"), tx(" "), fn("obstacle_devant()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"tourner_droite()"}],
      "tokens": ["tourner_droite()", "avancer()", "s_arreter()", "ramasser()"],
      "feedbackOk": "Quand la condition est vraie, le bloc indente en-dessous est execute.",
      "feedbackKo": "Si quelque chose bloque le passage, mieux vaut changer de direction.",
    },
    {
      "title": "Manche 2 : Capteur + action",
      "description": "Si le sol a une couleur (par exemple une pomme rouge), le robot ramasse.",
      "codeLines": [
        line(kw("si"), tx(" "), slot("slot1"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot2")),
      ],
      "slots": [
        {"id":"slot1","correct":"couleur_sol()"},
        {"id":"slot2","correct":"ramasser()"}
      ],
      "tokens": ["couleur_sol()", "obstacle_devant()", "ramasser()", "avancer()", "tourner_droite()"],
      "feedbackOk": "Une condition utilise un capteur (qui renvoie une info), suivi d'une action si c'est vrai.",
      "feedbackKo": "Pour detecter une couleur, quelle fonction-capteur utiliser ? Et que fait le robot face a une pomme ?",
    },
    {
      "title": "Manche 3 : Declencheur ET action",
      "description": "Si on detecte un obstacle DERRIERE, le robot avance et affiche un message.",
      "codeLines": [
        line(kw("si"), tx(" "), slot("slot1"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), slot("slot2")),
        line(tx(IND), fn("afficher"), tx("("), st("\"attention\""), tx(")")),
      ],
      "slots": [
        {"id":"slot1","correct":"obstacle_derriere()"},
        {"id":"slot2","correct":"avancer()"}
      ],
      "tokens": ["obstacle_derriere()", "obstacle_devant()", "avancer()", "reculer()", "tourner_droite()"],
      "feedbackOk": "Tu as bien lu : le declencheur est le capteur arriere et l'action eloigne du danger.",
      "feedbackKo": "Le capteur arriere detecte. Quel mouvement eloigne le robot du danger derriere ?",
    },
  ]
})

# --- s2_06 ---
EXERCISES.append({
  "slug": "s2_06_si_sinon",
  "title": "SI ... SINON",
  "header_h1": "Conditions SI / SINON",
  "header_sub": "Choisir entre deux actions",
  "icon": "🔀",
  "interaction_code": "mcg_codage_s2_06_si_sinon",
  "concept": "Construire un SI/SINON, puis une cascade SI/SINON SI/SINON.",
  "completion_msg": "Tu maitrises maintenant le SI / SINON et les conditions en cascade. Excellent travail !",
  "rounds": [
    {
      "title": "Manche 1 : Complete le SINON",
      "description": "Le robot tourne s'il y a un mur. Sinon, il avance. Complete la branche manquante.",
      "codeLines": [
        line(kw("si"), tx(" "), fn("obstacle_devant()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("tourner_droite()")),
        line(kw("sinon"), tx(" :")),
        line(tx(IND), slot("slot1")),
      ],
      "slots": [{"id":"slot1","correct":"avancer()"}],
      "tokens": ["avancer()", "reculer()", "tourner_gauche()", "s_arreter()"],
      "feedbackOk": "Le SINON s'execute quand la condition du SI est fausse : pas d'obstacle => le robot avance.",
      "feedbackKo": "Quand il n'y a pas de mur devant, qu'est-ce que le robot devrait logiquement faire ?",
    },
    {
      "title": "Manche 2 : SI et SINON",
      "description": "Le robot ramasse s'il voit une pomme, sinon il avance.",
      "codeLines": [
        line(kw("si"), tx(" "), slot("slot1"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("ramasser()")),
        line(kw("sinon"), tx(" :")),
        line(tx(IND), slot("slot2")),
      ],
      "slots": [
        {"id":"slot1","correct":"couleur_sol()"},
        {"id":"slot2","correct":"avancer()"}
      ],
      "tokens": ["couleur_sol()", "obstacle_devant()", "avancer()", "reculer()", "tourner_droite()"],
      "feedbackOk": "Tu as bien identifie la condition (capteur) ET l'action alternative.",
      "feedbackKo": "Une condition se construit avec un capteur. Et le SINON contient une action differente du SI.",
    },
    {
      "title": "Manche 3 : SI / SINON SI / SINON",
      "description": "Selon la temperature, le robot affiche un message different.",
      "codeLines": [
        line(kw("si"), tx(" "), vr("temperature"), tx(" "), op("<"), tx(" "), num("18"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), slot("slot1"), tx(")")),
        line(kw("sinon si"), tx(" "), vr("temperature"), tx(" "), op("≤"), tx(" "), num("23"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), slot("slot2"), tx(")")),
        line(kw("sinon"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), slot("slot3"), tx(")")),
      ],
      "slots": [
        {"id":"slot1","correct":"\"froid\""},
        {"id":"slot2","correct":"\"parfait\""},
        {"id":"slot3","correct":"\"chaud\""}
      ],
      "tokens": ["\"froid\"", "\"parfait\"", "\"chaud\"", "\"gagne\"", "\"perdu\""],
      "feedbackOk": "Bravo ! Une cascade SI / SINON SI / SINON teste les conditions une par une, dans l'ordre.",
      "feedbackKo": "Relis l'ordre : la 1re condition c'est < 18, la 2e entre 18 et 23, la 3e c'est tout le reste.",
    },
  ]
})

# --- s3_02 ---
EXERCISES.append({
  "slug": "s3_02_repeter",
  "title": "Repeter X fois",
  "header_h1": "Boucle REPETER",
  "header_sub": "Refaire la meme chose plusieurs fois",
  "icon": "🔁",
  "interaction_code": "mcg_codage_s3_02_repeter",
  "concept": "Choisir le bon nombre de repetitions pour dessiner une figure geometrique.",
  "completion_msg": "Une boucle 'repeter' raccourcit le code : on dit COMBIEN de fois, pas QUELLES instructions repeter.",
  "rounds": [
    {
      "title": "Manche 1 : Le carre",
      "description": "Le robot dessine un carre : avance + tourne, repete plusieurs fois.",
      "codeLines": [
        line(cmt("# Dessine un carre")),
        line(kw("repeter"), tx(" "), slot("slot1"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), fn("avancer()")),
        line(tx(IND), fn("tourner_droite()")),
      ],
      "slots": [{"id":"slot1","correct":"4"}],
      "tokens": ["3", "4", "5", "6", "8"],
      "feedbackOk": "Un carre a 4 cotes et 4 angles : on repete 4 fois 'avance + tourne'.",
      "feedbackKo": "Compte les cotes d'un carre.",
    },
    {
      "title": "Manche 2 : Le triangle",
      "description": "Meme code, mais pour un triangle equilateral.",
      "codeLines": [
        line(cmt("# Dessine un triangle equilateral")),
        line(kw("repeter"), tx(" "), slot("slot1"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), fn("avancer()")),
        line(tx(IND), fn("tourner_droite()")),
      ],
      "slots": [{"id":"slot1","correct":"3"}],
      "tokens": ["3", "4", "5", "6"],
      "feedbackOk": "Un triangle = 3 cotes. La boucle repete la sequence 3 fois.",
      "feedbackKo": "Combien de cotes a un triangle ?",
    },
    {
      "title": "Manche 3 : L'hexagone",
      "description": "Une figure a 6 cotes.",
      "codeLines": [
        line(cmt("# Dessine un hexagone regulier")),
        line(kw("repeter"), tx(" "), slot("slot1"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), fn("avancer()")),
        line(tx(IND), fn("tourner_droite()")),
      ],
      "slots": [{"id":"slot1","correct":"6"}],
      "tokens": ["4", "5", "6", "8", "10"],
      "feedbackOk": "Un hexagone a 6 cotes. La boucle repete l'instruction 6 fois.",
      "feedbackKo": "Hexa = six.",
    },
  ]
})

# --- s3_04 ---
EXERCISES.append({
  "slug": "s3_04_tantque",
  "title": "TANT QUE",
  "header_h1": "Boucle TANT QUE",
  "header_sub": "Repeter selon une condition",
  "icon": "⏳",
  "interaction_code": "mcg_codage_s3_04_tantque",
  "concept": "Construire une boucle 'tant_que' avec sa condition d'arret.",
  "completion_msg": "Une boucle 'tant_que' continue tant que sa condition est vraie. Elle s'arrete des qu'elle devient fausse.",
  "rounds": [
    {
      "title": "Manche 1 : Avancer sans heurter",
      "description": "Le robot avance tant qu'il n'y a pas de mur devant lui.",
      "codeLines": [
        line(cmt("# Avancer tant qu'il n'y a pas de mur")),
        line(kw("tant_que"), tx(" "), slot("slot1"), tx(" :")),
        line(tx(IND), fn("avancer()")),
      ],
      "slots": [{"id":"slot1","correct":"pas obstacle_devant()"}],
      "tokens": ["pas obstacle_devant()", "obstacle_devant()", "couleur_sol()", "pas couleur_sol()"],
      "feedbackOk": "Le mot-cle 'pas' inverse la condition : on continue TANT QU'il n'y a PAS d'obstacle.",
      "feedbackKo": "On veut que le robot avance quand il n'y a rien devant. Comment exprimer 'pas d'obstacle' ?",
    },
    {
      "title": "Manche 2 : Avant d'atteindre 10",
      "description": "Le robot avance tant que le compteur reste sous 10.",
      "codeLines": [
        line(cmt("# Avance jusqu'a ce que le compteur atteigne 10")),
        line(kw("tant_que"), tx(" "), vr("compteur"), tx(" "), slot("slot1"), tx(" "), slot("slot2"), tx(" :")),
        line(tx(IND), fn("avancer()")),
      ],
      "slots": [
        {"id":"slot1","correct":"<"},
        {"id":"slot2","correct":"10"}
      ],
      "tokens": ["<", ">", "=", "≤", "5", "10", "18", "20"],
      "feedbackOk": "Tant que le compteur est strictement inferieur a 10, on continue. A 10, on sort.",
      "feedbackKo": "On veut s'arreter A 10. Donc on continue tant que le compteur reste SOUS 10.",
    },
    {
      "title": "Manche 3 : Boucle avec capteur",
      "description": "Le robot avance tant que le sol est neutre, puis recule.",
      "codeLines": [
        line(cmt("# Avance tant que le sol est neutre")),
        line(kw("tant_que"), tx(" "), slot("slot1"), tx(" :")),
        line(tx(IND), slot("slot2")),
        line(fn("reculer()")),
      ],
      "slots": [
        {"id":"slot1","correct":"pas couleur_sol()"},
        {"id":"slot2","correct":"avancer()"}
      ],
      "tokens": ["pas couleur_sol()", "couleur_sol()", "avancer()", "reculer()", "tourner_droite()"],
      "feedbackOk": "Quand 'couleur_sol()' devient vrai (sol colore), la boucle s'arrete et le robot recule.",
      "feedbackKo": "Pendant la boucle, le sol est neutre (couleur_sol() = faux), et le robot continue d'avancer.",
    },
  ]
})

# --- s4_02 ---
EXERCISES.append({
  "slug": "s4_02_boucle_condition",
  "title": "Boucle + Condition",
  "header_h1": "Boucle + Condition",
  "header_sub": "Combiner pour reagir pendant une boucle",
  "icon": "🧩",
  "interaction_code": "mcg_codage_s4_02_boucle_condition",
  "concept": "Imbriquer une condition dans une boucle pour adapter le comportement a chaque tour.",
  "completion_msg": "Tu sais imbriquer une condition dans une boucle : a chaque tour, le robot peut reagir differemment.",
  "rounds": [
    {
      "title": "Manche 1 : Repeter avec un SI",
      "description": "Pendant 5 tours : avance, et tourne s'il y a un obstacle.",
      "codeLines": [
        line(cmt("# 5 tours, en evitant les obstacles")),
        line(kw("repeter"), tx(" "), num("5"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), fn("avancer()")),
        line(tx(IND), kw("si"), tx(" "), slot("slot1"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND+IND), fn("tourner_droite()")),
      ],
      "slots": [{"id":"slot1","correct":"obstacle_devant()"}],
      "tokens": ["obstacle_devant()", "couleur_sol()", "pas obstacle_devant()", "distance()"],
      "feedbackOk": "Pendant la boucle, on verifie a chaque tour s'il y a un obstacle pour reagir.",
      "feedbackKo": "On veut tourner UNIQUEMENT quand il y a un mur. Quel capteur detecte un obstacle devant ?",
    },
    {
      "title": "Manche 2 : Boucle + SI/SINON",
      "description": "Pendant 10 tours : ramasse une pomme, ou avance.",
      "codeLines": [
        line(cmt("# Recolter ou explorer pendant 10 tours")),
        line(kw("repeter"), tx(" "), num("10"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), kw("si"), tx(" "), fn("couleur_sol()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND+IND), slot("slot1")),
        line(tx(IND), kw("sinon"), tx(" :")),
        line(tx(IND+IND), slot("slot2")),
      ],
      "slots": [
        {"id":"slot1","correct":"ramasser()"},
        {"id":"slot2","correct":"avancer()"}
      ],
      "tokens": ["ramasser()", "avancer()", "reculer()", "s_arreter()", "tourner_gauche()"],
      "feedbackOk": "Une boucle peut contenir un SI/SINON : a chaque tour, on choisit l'action selon la condition.",
      "feedbackKo": "Quand il y a une pomme (couleur_sol vraie), on la ramasse. Sinon, on continue d'explorer.",
    },
    {
      "title": "Manche 3 : Imbrications",
      "description": "Tant qu'il n'y a pas d'obstacle, ramasse ou avance selon le sol.",
      "codeLines": [
        line(cmt("# Boucle conditionnelle + choix d'action")),
        line(kw("tant_que"), tx(" "), slot("slot1"), tx(" :")),
        line(tx(IND), kw("si"), tx(" "), fn("couleur_sol()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND+IND), slot("slot2")),
        line(tx(IND), kw("sinon"), tx(" :")),
        line(tx(IND+IND), slot("slot3")),
      ],
      "slots": [
        {"id":"slot1","correct":"pas obstacle_devant()"},
        {"id":"slot2","correct":"ramasser()"},
        {"id":"slot3","correct":"avancer()"}
      ],
      "tokens": ["pas obstacle_devant()", "obstacle_devant()", "ramasser()", "avancer()", "reculer()", "s_arreter()"],
      "feedbackOk": "La boucle gere l'arret (obstacle), la condition interne gere le choix d'action (sol).",
      "feedbackKo": "Le robot doit boucler 'tant qu'il y a de la place'. A l'interieur, il choisit selon le sol.",
    },
  ]
})

# --- s4_04 ---
EXERCISES.append({
  "slug": "s4_04_compteur",
  "title": "Compteur dans une boucle",
  "header_h1": "Compteur dans une boucle",
  "header_sub": "Initialiser, incrementer, utiliser",
  "icon": "🔢",
  "interaction_code": "mcg_codage_s4_04_compteur",
  "concept": "Utiliser une variable comme compteur dans une boucle.",
  "completion_msg": "Initialiser, incrementer, et utiliser un compteur : trois etapes essentielles dans tout programme avec boucle.",
  "rounds": [
    {
      "title": "Manche 1 : Initialiser et incrementer",
      "description": "Le compteur demarre a 0, et augmente d'un a chaque tour.",
      "codeLines": [
        line(cmt("# Compter de 1 a 5")),
        line(vr("compteur"), tx(" "), op("="), tx(" "), slot("slot1")),
        line(kw("repeter"), tx(" "), num("5"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), vr("compteur"), tx(" "), op("="), tx(" "), vr("compteur"), tx(" + "), slot("slot2")),
        line(tx(IND), fn("afficher"), tx("("), vr("compteur"), tx(")")),
      ],
      "slots": [
        {"id":"slot1","correct":"0"},
        {"id":"slot2","correct":"1"}
      ],
      "tokens": ["0", "1", "5", "10", "100"],
      "feedbackOk": "On demarre a 0, puis on ajoute 1 a chaque tour : c'est le compteur classique.",
      "feedbackKo": "Un compteur demarre generalement a zero, et progresse d'un en un.",
    },
    {
      "title": "Manche 2 : Boucle qui s'arrete sur le compteur",
      "description": "Le robot avance jusqu'a ce que son compteur atteigne 10.",
      "codeLines": [
        line(cmt("# Avance pendant 10 pas")),
        line(vr("compteur"), tx(" "), op("="), tx(" "), slot("slot1")),
        line(kw("tant_que"), tx(" "), vr("compteur"), tx(" "), slot("slot2"), tx(" "), num("10"), tx(" :")),
        line(tx(IND), fn("avancer()")),
        line(tx(IND), vr("compteur"), tx(" "), op("="), tx(" "), vr("compteur"), tx(" + "), slot("slot3")),
      ],
      "slots": [
        {"id":"slot1","correct":"0"},
        {"id":"slot2","correct":"<"},
        {"id":"slot3","correct":"1"}
      ],
      "tokens": ["0", "1", "<", ">", "=", "≤"],
      "feedbackOk": "Trois ingredients d'une boucle compteur : depart a 0, condition < 10, increment +1.",
      "feedbackKo": "Initialise a zero, continue tant que le compteur N'A PAS atteint 10, et augmente d'un a chaque tour.",
    },
    {
      "title": "Manche 3 : Compteur conditionnel",
      "description": "Compte le nombre de pommes ramassees pendant 20 pas.",
      "codeLines": [
        line(cmt("# Compter les pommes ramassees")),
        line(vr("pommes"), tx(" "), op("="), tx(" "), slot("slot1")),
        line(kw("repeter"), tx(" "), num("20"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), kw("si"), tx(" "), fn("couleur_sol()"), tx(" "), kw("alors"), tx(" :")),
        line(tx(IND+IND), fn("ramasser()")),
        line(tx(IND+IND), vr("pommes"), tx(" "), op("="), tx(" "), vr("pommes"), tx(" + "), slot("slot2")),
        line(tx(IND), fn("avancer()")),
        line(fn("afficher"), tx("("), slot("slot3"), tx(")")),
      ],
      "slots": [
        {"id":"slot1","correct":"0"},
        {"id":"slot2","correct":"1"},
        {"id":"slot3","correct":"pommes"}
      ],
      "tokens": ["0", "1", "5", "10", "pommes", "compteur", "score"],
      "feedbackOk": "Le compteur 'pommes' augmente UNIQUEMENT quand une pomme est trouvee : c'est un compteur conditionnel.",
      "feedbackKo": "Demarre a zero, ajoute 1 seulement quand on trouve une pomme, et affiche le total final.",
    },
  ]
})

# --- s5_02 ---
TEMP_PROG_18_23 = [
  line(kw("si"), tx(" "), vr("temperature"), tx(" "), op("<"), tx(" "), num("18"), tx(" "), kw("alors"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"froid\""), tx(")")),
  line(kw("sinon si"), tx(" "), vr("temperature"), tx(" "), op("≤"), tx(" "), num("23"), tx(" "), kw("alors"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"parfait\""), tx(")")),
  line(kw("sinon"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"chaud\""), tx(")")),
]
TEMP_PROG_15_25 = [
  line(kw("si"), tx(" "), vr("temperature"), tx(" "), op("<"), tx(" "), num("15"), tx(" "), kw("alors"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"froid\""), tx(")")),
  line(kw("sinon si"), tx(" "), vr("temperature"), tx(" "), op("≤"), tx(" "), num("25"), tx(" "), kw("alors"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"parfait\""), tx(")")),
  line(kw("sinon"), tx(" :")),
  line(tx(IND), fn("afficher"), tx("("), st("\"chaud\""), tx(")")),
]

EXERCISES.append({
  "slug": "s5_02_trace_temperature",
  "title": "Trace : SI / SINON SI / SINON",
  "header_h1": "Trace d'execution",
  "header_sub": "Que va afficher le programme ?",
  "icon": "📋",
  "interaction_code": "mcg_codage_s5_02_trace_temperature",
  "concept": "Tracer pas a pas l'execution d'une cascade de conditions.",
  "completion_msg": "Tracer un programme = jouer le role de l'ordinateur. Tu suis les conditions une par une, dans l'ordre.",
  "rounds": [
    {
      "title": "Manche 1 : Trois temperatures",
      "description": "Pour chaque temperature, glisse le bon mot affiche dans le tableau.",
      "codeLines": TEMP_PROG_18_23,
      "traceTable": {
        "headers": ["Temperature", "Affichage"],
        "rows": [
          {"input":"15", "slotId":"slot1"},
          {"input":"22", "slotId":"slot2"},
          {"input":"28", "slotId":"slot3"},
        ]
      },
      "slots": [
        {"id":"slot1","correct":"\"froid\""},
        {"id":"slot2","correct":"\"parfait\""},
        {"id":"slot3","correct":"\"chaud\""}
      ],
      "tokens": ["\"froid\"", "\"parfait\"", "\"chaud\"", "\"gagne\"", "\"perdu\""],
      "feedbackOk": "Tu as suivi la cascade : la 1re condition vraie declenche l'action, le reste est ignore.",
      "feedbackKo": "Pour chaque temperature, verifie chaque condition dans l'ordre. La 1re vraie gagne.",
    },
    {
      "title": "Manche 2 : Aux bornes",
      "description": "Memes conditions, mais des valeurs delicates : 17, 18, 23, 24.",
      "codeLines": TEMP_PROG_18_23,
      "traceTable": {
        "headers": ["Temperature", "Affichage"],
        "rows": [
          {"input":"17", "slotId":"slot1"},
          {"input":"18", "slotId":"slot2"},
          {"input":"23", "slotId":"slot3"},
          {"input":"24", "slotId":"slot4"},
        ]
      },
      "slots": [
        {"id":"slot1","correct":"\"froid\""},
        {"id":"slot2","correct":"\"parfait\""},
        {"id":"slot3","correct":"\"parfait\""},
        {"id":"slot4","correct":"\"chaud\""}
      ],
      "tokens": ["\"froid\"", "\"parfait\"", "\"parfait\"", "\"chaud\"", "\"gagne\"", "\"perdu\""],
      "feedbackOk": "Aux bornes, attention a < (strict) vs ≤ (large). 18 n'est pas < 18 mais 18 ≤ 23, donc 'parfait'.",
      "feedbackKo": "18 n'est PAS strictement < 18, mais 18 EST ≤ 23. Et 23 ≤ 23 est aussi vrai.",
    },
    {
      "title": "Manche 3 : Nouveaux seuils",
      "description": "Le programme a change : seuils 15 et 25. Adapte tes reponses.",
      "codeLines": TEMP_PROG_15_25,
      "traceTable": {
        "headers": ["Temperature", "Affichage"],
        "rows": [
          {"input":"10", "slotId":"slot1"},
          {"input":"15", "slotId":"slot2"},
          {"input":"20", "slotId":"slot3"},
          {"input":"25", "slotId":"slot4"},
          {"input":"30", "slotId":"slot5"},
        ]
      },
      "slots": [
        {"id":"slot1","correct":"\"froid\""},
        {"id":"slot2","correct":"\"parfait\""},
        {"id":"slot3","correct":"\"parfait\""},
        {"id":"slot4","correct":"\"parfait\""},
        {"id":"slot5","correct":"\"chaud\""}
      ],
      "tokens": ["\"froid\"", "\"parfait\"", "\"parfait\"", "\"parfait\"", "\"chaud\"", "\"gagne\"", "\"perdu\""],
      "feedbackOk": "Les seuils ont change (15, 25) mais la logique reste la meme : 1re condition vraie gagne.",
      "feedbackKo": "Adapte aux nouveaux seuils : < 15 = froid, entre 15 et 25 inclus = parfait, sinon chaud.",
    },
  ]
})

# --- s5_03 ---
EXERCISES.append({
  "slug": "s5_03_trace_boucle",
  "title": "Trace : boucle",
  "header_h1": "Trace d'une boucle",
  "header_sub": "Combien de tours ? Quelles valeurs ?",
  "icon": "🔬",
  "interaction_code": "mcg_codage_s5_03_trace_boucle",
  "concept": "Tracer le nombre d'iterations et les valeurs successives d'une boucle.",
  "completion_msg": "Tracer une boucle = lister les valeurs successives du compteur. Si tu hesites, fais-le sur ton cahier.",
  "rounds": [
    {
      "title": "Manche 1 : Combien de tours ?",
      "description": "Compte le nombre de fois ou 'tour' s'affiche.",
      "codeLines": [
        line(vr("compteur"), tx(" "), op("="), tx(" "), num("0")),
        line(kw("tant_que"), tx(" "), vr("compteur"), tx(" "), op("<"), tx(" "), num("5"), tx(" :")),
        line(tx(IND), fn("afficher"), tx("("), st("\"tour\""), tx(")")),
        line(tx(IND), vr("compteur"), tx(" "), op("="), tx(" "), vr("compteur"), tx(" + "), num("1")),
      ],
      "traceTable": {
        "headers": ["Question", "Reponse"],
        "rows": [
          {"input":"Nombre de 'tour' affiches", "slotId":"slot1"}
        ]
      },
      "slots": [{"id":"slot1","correct":"5"}],
      "tokens": ["3", "4", "5", "6", "10"],
      "feedbackOk": "La boucle s'execute pour compteur = 0, 1, 2, 3, 4 -- soit 5 tours.",
      "feedbackKo": "Liste les valeurs du compteur tant que la condition est vraie : 0, 1, 2, 3, 4. Puis 5, on sort.",
    },
    {
      "title": "Manche 2 : Valeur finale",
      "description": "A la fin de la boucle, quelle est la valeur du compteur ?",
      "codeLines": [
        line(vr("compteur"), tx(" "), op("="), tx(" "), num("1")),
        line(kw("repeter"), tx(" "), num("4"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), vr("compteur"), tx(" "), op("="), tx(" "), vr("compteur"), tx(" * "), num("2")),
      ],
      "traceTable": {
        "headers": ["Question", "Reponse"],
        "rows": [
          {"input":"Valeur finale de compteur", "slotId":"slot1"}
        ]
      },
      "slots": [{"id":"slot1","correct":"16"}],
      "tokens": ["4", "8", "16", "32", "64"],
      "feedbackOk": "Tour 1 : 2 ; Tour 2 : 4 ; Tour 3 : 8 ; Tour 4 : 16. La multiplication accelere vite !",
      "feedbackKo": "Suis l'evolution etape par etape : 1 -> 2 -> 4 -> 8 -> ?",
    },
    {
      "title": "Manche 3 : Affichages successifs",
      "description": "Que s'affiche-t-il a chaque tour de la boucle ?",
      "codeLines": [
        line(vr("compteur"), tx(" "), op("="), tx(" "), num("0")),
        line(kw("repeter"), tx(" "), num("3"), tx(" "), kw("fois"), tx(" :")),
        line(tx(IND), vr("compteur"), tx(" "), op("="), tx(" "), vr("compteur"), tx(" + "), num("2")),
        line(tx(IND), fn("afficher"), tx("("), vr("compteur"), tx(")")),
      ],
      "traceTable": {
        "headers": ["Tour", "Affiche"],
        "rows": [
          {"input":"Tour 1", "slotId":"slot1"},
          {"input":"Tour 2", "slotId":"slot2"},
          {"input":"Tour 3", "slotId":"slot3"},
        ]
      },
      "slots": [
        {"id":"slot1","correct":"2"},
        {"id":"slot2","correct":"4"},
        {"id":"slot3","correct":"6"}
      ],
      "tokens": ["0", "1", "2", "3", "4", "6", "8"],
      "feedbackOk": "A chaque tour : on ajoute 2 puis on affiche. La sequence est 2, 4, 6.",
      "feedbackKo": "Le compteur demarre a 0. Tour 1 : +2 = 2. Tour 2 : +2 = 4. Continue ainsi.",
    },
  ]
})

# --- s6_02 ---
EXERCISES.append({
  "slug": "s6_02_collecteur",
  "title": "Le robot collecteur",
  "header_h1": "Ecris ton programme",
  "header_sub": "Glisse les lignes dans le bon ordre",
  "icon": "🍎",
  "interaction_code": "mcg_codage_s6_02_collecteur",
  "concept": "Reordonner des lignes de pseudo-code pour former un programme coherent.",
  "completion_msg": "L'ordre des lignes est crucial : initialisation -> boucle -> corps -> sortie. Tu as compris la structure !",
  "rounds": [
    {
      "title": "Manche 1 : Compter jusqu'a 5",
      "description": "Reordonne ces 3 lignes pour creer un compteur de 0 a 5.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"compteur = 0"},
        {"id":"slot1","correct":"repeter 5 fois :"},
        {"id":"slot2","correct":"  compteur = compteur + 1"}
      ],
      "tokens": ["  compteur = compteur + 1", "compteur = 0", "repeter 5 fois :"],
      "feedbackOk": "L'initialisation vient AVANT la boucle, et l'increment est A L'INTERIEUR de la boucle.",
      "feedbackKo": "Pour qu'un compteur fonctionne, il doit d'abord etre cree (=0) avant que la boucle demarre.",
    },
    {
      "title": "Manche 2 : Compter les pommes",
      "description": "5 lignes a remettre dans l'ordre : un compteur conditionnel.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"compteur = 0"},
        {"id":"slot1","correct":"repeter 10 fois :"},
        {"id":"slot2","correct":"  si couleur_sol() alors :"},
        {"id":"slot3","correct":"    compteur = compteur + 1"},
        {"id":"slot4","correct":"  avancer()"}
      ],
      "tokens": [
        "  avancer()",
        "compteur = 0",
        "    compteur = compteur + 1",
        "  si couleur_sol() alors :",
        "repeter 10 fois :"
      ],
      "feedbackOk": "L'indentation t'a aide : SI dans la BOUCLE, action conditionnelle dans le SI.",
      "feedbackKo": "Indentation = niveau d'imbrication. Une ligne plus indentee appartient au bloc precedent.",
    },
    {
      "title": "Manche 3 : Programme complet",
      "description": "7 lignes : un programme entier avec compteur, boucle conditionnelle et affichage final.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"pommes = 0"},
        {"id":"slot1","correct":"tant_que pas obstacle_devant() :"},
        {"id":"slot2","correct":"  avancer()"},
        {"id":"slot3","correct":"  si couleur_sol() alors :"},
        {"id":"slot4","correct":"    ramasser()"},
        {"id":"slot5","correct":"    pommes = pommes + 1"},
        {"id":"slot6","correct":"afficher(pommes)"}
      ],
      "tokens": [
        "  si couleur_sol() alors :",
        "afficher(pommes)",
        "    ramasser()",
        "tant_que pas obstacle_devant() :",
        "    pommes = pommes + 1",
        "  avancer()",
        "pommes = 0"
      ],
      "feedbackOk": "Programme complet : compteur, boucle conditionnelle, action conditionnelle, sortie. Tout est la !",
      "feedbackKo": "Pense au flux : initialise -> boucle (avec condition de sortie) -> corps -> affichage final.",
    },
  ]
})

# --- s6_03 ---
EXERCISES.append({
  "slug": "s6_03_labyrinthe",
  "title": "Le labyrinthe",
  "header_h1": "Sortir du labyrinthe",
  "header_sub": "Glisse les lignes dans l'ordre",
  "icon": "🧭",
  "interaction_code": "mcg_codage_s6_03_labyrinthe",
  "concept": "Reconstruire un programme de navigation dans un labyrinthe.",
  "completion_msg": "Tu sais structurer un programme de navigation : boucler, detecter, decider, agir.",
  "rounds": [
    {
      "title": "Manche 1 : Tourne face au mur",
      "description": "Le robot avance jusqu'au mur, puis tourne.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"tant_que pas obstacle_devant() :"},
        {"id":"slot1","correct":"  avancer()"},
        {"id":"slot2","correct":"si obstacle_devant() alors :"},
        {"id":"slot3","correct":"  tourner_droite()"}
      ],
      "tokens": [
        "  tourner_droite()",
        "  avancer()",
        "tant_que pas obstacle_devant() :",
        "si obstacle_devant() alors :"
      ],
      "feedbackOk": "Le robot avance tant qu'il peut, puis -- une fois bloque -- il change de direction.",
      "feedbackKo": "D'abord avancer tant que c'est possible. Quand on est bloque, on tourne.",
    },
    {
      "title": "Manche 2 : Mur a droite et a gauche",
      "description": "Si la voie de droite est bloquee aussi, le robot fait demi-tour.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"tant_que pas obstacle_devant() :"},
        {"id":"slot1","correct":"  avancer()"},
        {"id":"slot2","correct":"tourner_droite()"},
        {"id":"slot3","correct":"si obstacle_devant() alors :"},
        {"id":"slot4","correct":"  tourner_gauche()"},
        {"id":"slot5","correct":"  tourner_gauche()"}
      ],
      "tokens": [
        "tourner_droite()",
        "  tourner_gauche()",
        "  avancer()",
        "  tourner_gauche()",
        "tant_que pas obstacle_devant() :",
        "si obstacle_devant() alors :"
      ],
      "feedbackOk": "Strategie : essayer la droite, et si bloque la aussi, faire demi-tour (deux 1/4 de tour a gauche).",
      "feedbackKo": "Avancer, tourner a droite pour essayer la sortie, et si encore bloque -- demi-tour a gauche.",
    },
    {
      "title": "Manche 3 : Compteur de tentatives",
      "description": "Le robot tente 3 fois de sortir. A chaque tentative, il avance ou tourne.",
      "mode": "order",
      "slots": [
        {"id":"slot0","correct":"tentatives = 0"},
        {"id":"slot1","correct":"tant_que tentatives < 3 :"},
        {"id":"slot2","correct":"  si pas obstacle_devant() alors :"},
        {"id":"slot3","correct":"    avancer()"},
        {"id":"slot4","correct":"  sinon :"},
        {"id":"slot5","correct":"    tourner_droite()"},
        {"id":"slot6","correct":"  tentatives = tentatives + 1"},
        {"id":"slot7","correct":"afficher(tentatives)"}
      ],
      "tokens": [
        "  sinon :",
        "tant_que tentatives < 3 :",
        "    tourner_droite()",
        "tentatives = 0",
        "  tentatives = tentatives + 1",
        "afficher(tentatives)",
        "    avancer()",
        "  si pas obstacle_devant() alors :"
      ],
      "feedbackOk": "Boucle limitee + condition + alternative + compteur : tu as relie tous les concepts vus.",
      "feedbackKo": "Initialise le compteur, boucle 'tant_que' bornee, alterne avancer/tourner, incremente, affiche.",
    },
  ]
})

assert len(EXERCISES) == 13, f"expected 13 exercises, got {len(EXERCISES)}"

def render(ex):
  rounds_json = json.dumps(ex["rounds"], ensure_ascii=False, indent=2)
  html = TEMPLATE
  replacements = {
    "__TITLE__": ex["title"],
    "__HEADER_H1__": ex["header_h1"],
    "__HEADER_SUB__": ex["header_sub"],
    "__ICON__": ex.get("icon","🧩"),
    "__TOKENS_LABEL__": "🎯 Glisse au bon endroit :",
    "__ROUNDS_JSON__": rounds_json,
    "__COMPLETION_MSG__": json.dumps(ex["completion_msg"], ensure_ascii=False),
    "__INTERACTION_CODE__": json.dumps(ex["interaction_code"]),
  }
  for k, v in replacements.items():
    html = html.replace(k, v)
  return html

for ex in EXERCISES:
  out = OUT_DIR / (ex["slug"] + ".html")
  out.write_text(render(ex), encoding="utf-8")
  print(f"wrote {out.name}")

# INDEX.md
index_lines = [
  "# Exercices interactifs -- Pensee computationnelle 9e CO",
  "",
  "13 mini-jeux de glisser-deposer, 3 manches chacun, ~2-3 min de jeu.",
  "Embed direct dans MiniCourseGenerator (iframe-safe, mobile-compatible).",
  "",
]
SECTIONS = [
  ("Section 1 -- Du VPL au pseudo-code", ["s1_03_fonctions_base", "s1_04_thymio_to_code"]),
  ("Section 2 -- Conditions",             ["s2_03_operateurs", "s2_04_si_simple", "s2_06_si_sinon"]),
  ("Section 3 -- Boucles",                ["s3_02_repeter", "s3_04_tantque"]),
  ("Section 4 -- Combinaisons",           ["s4_02_boucle_condition", "s4_04_compteur"]),
  ("Section 5 -- Trace d'execution",      ["s5_02_trace_temperature", "s5_03_trace_boucle"]),
  ("Section 6 -- Ecris ton programme",    ["s6_02_collecteur", "s6_03_labyrinthe"]),
]
ex_by_slug = {e["slug"]: e for e in EXERCISES}
for sec_title, slugs in SECTIONS:
  index_lines.append(f"## {sec_title}")
  index_lines.append("")
  for slug in slugs:
    e = ex_by_slug[slug]
    index_lines.append(f"- [`{slug}.html`]({slug}.html) -- **{e['title']}** -- {e['concept']}")
  index_lines.append("")

(OUT_DIR / "INDEX.md").write_text("\n".join(index_lines), encoding="utf-8")
print("wrote INDEX.md")

# --- iframe-embeds.md (snippets to paste into MiniCourseGenerator) ---
GH_BASE = "https://johnbub.github.io/games-for-minicourse/exercices"
embed_lines = [
  "# Snippets iframe -- MiniCourseGenerator",
  "",
  f"Base URL : `{GH_BASE}/`",
  "",
  "Chaque exercice envoie sa hauteur via postMessage (`SET_INSTRUCTION_HEIGHT`) -- MCG ajuste l'iframe automatiquement.",
  "Le `width=\"100%\"` est volontaire ; ne fixe pas de `height` (laisse MCG gerer).",
  "",
  "## Snippet generique",
  "",
  "```html",
  '<iframe src="' + GH_BASE + '/SLUG.html" width="100%" frameborder="0" scrolling="no" style="border:0;display:block;"></iframe>',
  "```",
  "",
  "Remplace `SLUG.html` par le nom de fichier voulu.",
  "",
]
for sec_title, slugs in SECTIONS:
  embed_lines.append(f"## {sec_title}")
  embed_lines.append("")
  for slug in slugs:
    e = ex_by_slug[slug]
    embed_lines.append(f"### {e['title']} -- `{slug}.html`")
    embed_lines.append("")
    embed_lines.append("```html")
    embed_lines.append(f'<iframe src="{GH_BASE}/{slug}.html" width="100%" frameborder="0" scrolling="no" style="border:0;display:block;"></iframe>')
    embed_lines.append("```")
    embed_lines.append("")
(OUT_DIR / "iframe-embeds.md").write_text("\n".join(embed_lines), encoding="utf-8")
print("wrote iframe-embeds.md")

# --- preview.html (viewer local pour tous les 13 a la fois) ---
preview_rows = []
for sec_title, slugs in SECTIONS:
  preview_rows.append(f'<h2 class="sec">{sec_title}</h2>')
  for slug in slugs:
    e = ex_by_slug[slug]
    preview_rows.append(f'''<section class="card">
  <header><h3>{e["title"]}</h3><code>{slug}.html</code></header>
  <iframe src="./{slug}.html" loading="lazy"></iframe>
  <a class="open" href="./{slug}.html" target="_blank">Ouvrir en plein ecran &rarr;</a>
</section>''')

preview_html = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Apercu -- 13 exercices</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#0d1b2a;color:#e0e1dd;padding:24px;min-height:100vh}
  h1{font-size:1.5rem;margin-bottom:6px}
  .lede{color:#90caf9;font-size:0.9rem;margin-bottom:24px}
  .sec{font-size:1rem;color:#90caf9;text-transform:uppercase;letter-spacing:1px;margin:30px 0 12px;border-bottom:1px solid #1b263b;padding-bottom:6px}
  .card{background:#1b263b;border-radius:12px;padding:14px;margin-bottom:18px;box-shadow:0 4px 16px rgba(0,0,0,0.25)}
  .card header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
  .card h3{font-size:0.95rem;color:white}
  .card code{font-size:0.7rem;color:#90caf9;background:#0d1b2a;padding:2px 8px;border-radius:4px}
  .card iframe{width:100%;height:720px;border:0;border-radius:8px;background:white;display:block}
  .card .open{display:inline-block;margin-top:8px;font-size:0.78rem;color:#90caf9;text-decoration:none}
  .card .open:hover{color:white}
  @media(min-width:1100px){body{max-width:980px;margin:0 auto}}
</style>
</head>
<body>
<h1>Apercu local -- 13 exercices interactifs</h1>
<p class="lede">Pour tester les 13 jeux avant publication. En production, utilise les snippets de <code>iframe-embeds.md</code>.</p>
__ROWS__
</body>
</html>
"""
preview_html = preview_html.replace("__ROWS__", "\n".join(preview_rows))
(OUT_DIR / "preview.html").write_text(preview_html, encoding="utf-8")
print("wrote preview.html")

print(f"Total: {len(EXERCISES)} exercices generes dans {OUT_DIR}")
