import os, sys, re, subprocess

print("=== AGENT-DELTA (QA & INTEGRATION) ===")

# 1. Read Alpha, Beta1, Beta2, Gamma
with open('/tmp/deepseek_alpha.js', 'r', encoding='utf-8') as f:
    alpha_lines = f.readlines()
with open('/tmp/deepseek_beta.js', 'r', encoding='utf-8') as f:
    beta1_text = f.read()
with open('/tmp/deepseek_beta_part2.js', 'r', encoding='utf-8') as f:
    beta2_lines = f.readlines()
with open('/tmp/deepseek_gamma.js', 'r', encoding='utf-8') as f:
    gamma_lines = f.readlines()

# Clean Alpha
alpha_clean = "".join(alpha_lines[1:-1])

# Clean Beta1 (cut before incomplete drawCAT6020B)
b1_lines = beta1_text.splitlines()
if b1_lines[0].startswith("```"):
    b1_lines = b1_lines[1:]
clean_b1 = "\n".join(b1_lines)
cat_idx = clean_b1.find("function drawCAT6020B")
if cat_idx != -1:
    clean_b1 = clean_b1[:cat_idx]

# Clean Beta2 (lines 3 to 797)
clean_b2 = "".join(beta2_lines[3:798])

# Clean Gamma (lines 1 to 823 + closing)
clean_gamma = "".join(gamma_lines[1:824]) + "\n})(typeof window !== 'undefined' ? window : this);\n"

# 2. Master Canvas Integration Glue Code
glue_code = """
/* ============================================================================
 * MASTER SCADA CANVAS RUNTIME GLUE
 * Connects Agent-Alpha, Agent-Beta, Agent-Gamma, Top HUD and Right Inspector
 * ============================================================================ */

const canvas = document.getElementById('scada-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

let panX = 0;
let panY = 0;
let zoom = 1.0;
let showOcrBadges = true;
let viewMode = 'iso';
let selectedTwinId = 'org.openegiz.mine:truck-01';
let simTime = 24.0;
let currentScenario = { id: 'NORMAL', mode: 'NORMAL', title: 'Штатный режим', message: 'Номинал' };
let fleetData = [];
let allTwinsList = [];

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (panX === 0 && panY === 0) {
    panX = rect.width * 0.5;
    panY = rect.height * 0.45;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function resetCanvasView() {
  const rect = canvas.parentElement.getBoundingClientRect();
  panX = rect.width * 0.5;
  panY = rect.height * 0.45;
  zoom = 1.0;
}

function adjustCanvasZoom(factor) {
  zoom = Math.max(0.4, Math.min(3.5, zoom * factor));
}

function toggleOcrBadges() {
  showOcrBadges = !showOcrBadges;
  const btn = document.getElementById('btn-toggle-labels');
  if (btn) btn.innerText = showOcrBadges ? '🏷️ Бейджи: ВКЛ' : '🏷️ Бейджи: ВЫКЛ';
}

function switchViewMode(mode) {
  viewMode = mode;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const btns = document.querySelectorAll('.tab-btn');
  if (mode === 'iso' && btns[0]) btns[0].classList.add('active');
  if (mode === 'flow' && btns[1]) btns[1].classList.add('active');
  if (mode === 'twins' && btns[2]) btns[2].classList.add('active');
}

// Mouse Controls
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX - panX;
  dragStartY = e.clientY - panY;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  adjustCanvasZoom(factor);
}, { passive: false });

// Click selection
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Check Beta equipment positions
  if (window.Beta && window.Beta.getEquipmentScreenPositions) {
    const positions = window.Beta.getEquipmentScreenPositions({ x: panX, y: panY }, zoom);
    let closestId = null;
    let minDist = 45;
    for (const id in positions) {
      const p = positions[id];
      const d = Math.hypot(mx - p.x, my - p.y);
      if (d < minDist) {
        minDist = d;
        closestId = id;
      }
    }
    if (closestId) {
      selectTwin(closestId);
      return;
    }
  }
});

// Master Render Loop (60 FPS CPU Friendly)
let lastT = performance.now();
function animate(currentTime) {
  const dt = (currentTime - lastT) / 1000;
  lastT = currentTime;
  simTime += dt * 1.0;

  const rect = canvas.getBoundingClientRect();
  const W = rect.width || canvas.width;
  const H = rect.height || canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Background & Engineering Grid
  ctx.fillStyle = '#0a0e17';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 45 * zoom;
  const ox = panX % gridSize;
  const oy = panY % gridSize;
  for (let x = ox; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = oy; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.restore();

  // Draw 2.5D Isometric World
  ctx.save();
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // 1. Terrain & Haul Road & Sump (Agent-Alpha)
  if (window.Alpha) {
    window.Alpha.drawTerrain(ctx);
    window.Alpha.drawSump(ctx, simTime, currentScenario.id === 'water-influx');
    window.Alpha.drawRoad(ctx);
  }

  // 2. 3D Facilities, Catenary & 8 BelAZ Fleet (Agent-Beta)
  if (window.Beta) {
    window.Beta.drawFacilities(ctx, currentScenario, simTime);
    window.Beta.drawCatenary(ctx, currentScenario, simTime);
    window.Beta.drawTrucks(ctx, currentScenario, simTime, selectedTwinId);
  }

  ctx.restore();

  // 3. X6 Non-Colliding Badges & Leader Lines (Agent-Gamma)
  if (showOcrBadges && window.Beta && window.Gamma) {
    const screenPos = window.Beta.getEquipmentScreenPositions({ x: panX, y: panY }, zoom);
    window.Gamma.drawAll(ctx, { showOcrBadges, selectedTwinId, scenario: currentScenario }, screenPos, zoom);
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// Twin Inspector Specifications & Physics Formulas
const TWIN_SPECS = {
  'org.openegiz.mine:truck-01': {
    name: 'БелАЗ-75131 #01 (Флагман)',
    type: 'Карьерный самосвал (136 т · 1200В DC)',
    policy: 'org.openegiz.policy:transport',
    horizon: '+25.0 м (Руководящий уклон 8.5%)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/truck-01',
    speed: '24.5 км/ч (⚡ 1200В DC)',
    payload: '136.0 т (Шихта Cu 0.850%)',
    braking: '13.4 м (ISO 3450:2011)',
    tkph: '612.5 / 840 (норма)',
    struts: '16.4 МПа (-13 см ход)',
    fuel: '24.5 л/ч (-82.7% экономия)',
    formula: `// 1. Термодинамика шин ISO 3450 / TKPH:
TKPH = Q_mean * V_avg = (136t * 0.5) * 24.5 km/h = 612.5 <= 840 TKPH

// 2. Тормозной путь по ISO 3450:2011 на уклоне 8.5%:
S_stop = v^2 / (2*g*(mu - i)) + v * t_react = 13.4 м

// 3. Экономия топлива на троллее 1200В:
Delta_Fuel = 142 л/ч - 24.5 л/ч = 117.5 л/ч (-82.7%)`
  },
  'org.openegiz.mine:crusher-01': {
    name: 'Дробилка ККД-1500/180',
    type: 'Конусная дробилка крупного дробления',
    policy: 'org.openegiz.policy:processing',
    horizon: '+122.0 м (Портал корпуса ГОК)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/crusher-01',
    speed: '2400 т/ч (Номинал)',
    payload: 'CSS = 180 мм (Гидроразгрузка 150 мм)',
    braking: '0.0 сек (Металлодетектор Tramp Metal)',
    tkph: 'N/A',
    struts: 'Гидроцилиндры вала: 28.5 МПа',
    fuel: '1,850 кВт электропривод',
    formula: `// 1. Формула Бонда для крупного дробления:
W = 10 * W_i * (1/sqrt(P80) - 1/sqrt(F80)) = 1.34 кВт*ч/т

// 2. Пропускная способность при CSS = 180 мм:
Q = 2400 т/ч (Вал опускается на 150 мм при попадании металла)`
  },
  'org.openegiz.mine:crusher-standby-02': {
    name: 'Резервная дробилка Metso LT140',
    type: 'Мобильная щековая дробилка на гусеничном шасси',
    policy: 'org.openegiz.policy:processing',
    horizon: '+118.0 м (Аварийная площадка)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/crusher-standby-02',
    speed: '550 т/ч (Готовность к пуску)',
    payload: 'CSS = 160 мм',
    braking: 'N/A',
    tkph: 'N/A',
    struts: 'N/A',
    fuel: '350 кВт дизель-гидравлика',
    formula: `// Авто-ввод резерва при аварии ККД-1500 (Gen-2):
T_switch = 120 сек, Q_contingency = 550 т/ч
Суммарно предотвращено потерь: $5,400,000`
  },
  'org.openegiz.mine:slope-radar-01': {
    name: 'Радар устойчивости бортов IBIS-FM',
    type: 'Интерферометрический георадар с синтезированной апертурой',
    policy: 'org.openegiz.policy:geotech',
    horizon: '+65.0 м (Западный наблюдательный пикет)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/slope-radar-01',
    speed: 'FoS = 1.34 (Устойчив)',
    payload: 'Скорость смещения: 0.12 мм/ч',
    braking: 'Inverse Velocity: 8.33 h/mm',
    tkph: 'N/A',
    struts: 'Поровое давление u_w = 56.3 кПа',
    fuel: '2.5 кВт (Солнце + АКБ)',
    formula: `// Критерий Кулона-Мора (Factor of Safety):
FoS = (c' + (sigma_n - u_w)*tan(phi')) / tau = 1.34 >= 1.30 (Норма)`
  },
  'org.openegiz.mine:pump-station-01': {
    name: 'Зумпф и Водоотливной узел (-60м)',
    type: 'Насосная станция WP-01 + шламовый понтон WP-02',
    policy: 'org.openegiz.policy:dewatering',
    horizon: '-62.0 м (Дно каньона)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/pump-station-01',
    speed: '240 м³/ч (WP-01)',
    payload: 'Уровень воды: 1.15 м (Безопасный: 1.50 м)',
    braking: 'WP-02 Standby: 320 м³/ч',
    tkph: 'N/A',
    struts: 'Пьезометрический напор: 18.2 м',
    fuel: '160 кВт насосный агрегат',
    formula: `// Гидрогеологический приток горизонта -60м:
Q_influx = 2 * pi * K * (H^2 - h0^2) / ln(R/r0) = 45 м³/ч (норма)
При прорыве (Gen-2): Q_influx = 350 м³/ч -> авто-пуск WP-02 (320 м³/ч)`
  },
  'org.openegiz.mine:excavator-01': {
    name: 'Экскаватор ЭКГ-15 #01',
    type: 'Электрический канатный экскаватор (ковш 15 м³)',
    policy: 'org.openegiz.policy:mining',
    horizon: '+60.0 м (Северный забой)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/excavator-01',
    speed: 'Погрузка в кузов 136т (148 сек цикл)',
    payload: 'Шихта: 1.35% Cu (Богатая руда)',
    braking: 'Ванты стрелы: 640 кН',
    tkph: 'N/A',
    struts: 'Износ зубьев 110Г13Л: 14.2%',
    fuel: '6 кВ электросеть (850 кВт)',
    formula: `// 1. Баланс шихтовки руды (EKF-PID):
g_target = (w_north * 1.35% + w_south * 0.45%) / (w_north + w_south) = 0.850% Cu`
  },
  'org.openegiz.mine:excavator-02': {
    name: 'Экскаватор CAT 6020B #02',
    type: 'Гидравлический экскаватор (обратная лопата 12 м³)',
    policy: 'org.openegiz.policy:mining',
    horizon: '-60.0 м (Глубокий горизонт)',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: 'telemetry/excavator-02',
    speed: 'Погрузка руды 0.45% Cu',
    payload: 'Шихта: 0.45% Cu (Бедная руда)',
    braking: 'Эвакуация при прорыве вод: 0.8 км/ч',
    tkph: 'N/A',
    struts: 'Давление гидросистемы: 35.0 МПа',
    fuel: '778 кВт дизель',
    formula: `// Эвакуационный подъем на +0м по рампе 12%:
t_evac = 450м / (0.8 км/ч) = 33.7 мин (до затопления подошвы)`
  }
};

function selectTwin(twinId) {
  selectedTwinId = twinId;
  const spec = TWIN_SPECS[twinId] || {
    name: twinId.replace('org.openegiz.mine:', ''),
    type: 'Цифровой двойник OpenEgiz',
    policy: 'org.openegiz.policy:mine',
    horizon: '0.0 м',
    parent: 'org.openegiz.mine:mine-01',
    mqtt: `telemetry/${twinId}`,
    speed: 'НОМИНАЛ',
    payload: '100% готовность',
    braking: 'N/A',
    tkph: 'N/A',
    struts: 'N/A',
    fuel: 'N/A',
    formula: `// Eclipse Ditto v2 Protocol Feature Access:
GET http://localhost:8080/api/2/things/${twinId}`
  };

  const setT = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  };

  setT('inspector-twin-name', spec.name);
  setT('inspector-twin-id-code', twinId);
  setT('ins-type', spec.type);
  setT('ins-policy', spec.policy);
  setT('ins-horizon', spec.horizon);
  setT('ins-parent', spec.parent);
  setT('ins-mqtt', spec.mqtt);
  setT('ins-speed', spec.speed);
  setT('ins-payload', spec.payload);
  setT('ins-braking', spec.braking);
  setT('ins-tkph', spec.tkph);
  setT('ins-struts', spec.struts);
  setT('ins-fuel', spec.fuel);
  setT('ins-formula-content', spec.formula);

  document.querySelectorAll('.twin-chip').forEach(chip => {
    if (chip.getAttribute('data-id') === twinId) {
      chip.classList.add('selected');
    } else {
      chip.classList.remove('selected');
    }
  });
}

function buildTwinSelectorGrid() {
  const grid = document.getElementById('twin-selector-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const list = [
    { id: 'org.openegiz.mine:truck-01', title: 'БелАЗ-75131 #01' },
    { id: 'org.openegiz.mine:crusher-01', title: 'ККД-1500/180' },
    { id: 'org.openegiz.mine:crusher-standby-02', title: 'Metso LT140' },
    { id: 'org.openegiz.mine:excavator-01', title: 'ЭКГ-15 #01 (+60м)' },
    { id: 'org.openegiz.mine:excavator-02', title: 'CAT 6020B (-60м)' },
    { id: 'org.openegiz.mine:slope-radar-01', title: 'Радар IBIS-FM' },
    { id: 'org.openegiz.mine:pump-station-01', title: 'Зумпф (-60м)' },
    { id: 'org.openegiz.mine:trolley-line-01', title: 'Троллей 1200В' },
    { id: 'org.openegiz.mine:substation-01', title: 'Подстанция 6МВт' },
    { id: 'org.openegiz.mine:stockpile-coarse-01', title: 'Склад руды 45кт' },
    { id: 'org.openegiz.mine:sag-mill-01', title: 'Мельница SAG' },
    { id: 'org.openegiz.mine:water-bowser-01', title: 'Ороситель 85м³' },
  ];
  for (const t of list) {
    const chip = document.createElement('div');
    chip.className = 'twin-chip' + (t.id === selectedTwinId ? ' selected' : '');
    chip.setAttribute('data-id', t.id);
    chip.innerHTML = `<div class="t-id">${t.title}</div><div class="t-stat">Ditto :8080</div>`;
    chip.onclick = () => selectTwin(t.id);
    grid.appendChild(chip);
  }
}
buildTwinSelectorGrid();

async function triggerScenario(id, mode) {
  try {
    const res = await fetch('/api/scenarios/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: id, mode })
    });
    const data = await res.json();
    updateScenarioUI(data.current || data.scenario || { id, mode });
  } catch (e) {
    console.error('Trigger scenario error:', e);
  }
}

async function revertAllScenarios() {
  try {
    const res = await fetch('/api/scenarios/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'all' })
    });
    const data = await res.json();
    updateScenarioUI(data.current || data.scenario || { id: 'NORMAL', mode: 'NORMAL' });
  } catch (e) {
    console.error('Revert scenario error:', e);
  }
}

function updateScenarioUI(s) {
  currentScenario = s;
  const pill = document.getElementById('incident-pill');
  const desc = document.getElementById('incident-desc');
  if (!pill || !desc) return;

  pill.className = 'status-badge';
  if (s.id === 'NORMAL') {
    pill.classList.add('baseline');
    pill.innerText = '● Штатный режим';
    desc.innerText = 'Все системы рудника в номинале. Тяговая сеть 1200В и ККД-1500 работают на 100%.';
  } else if (s.mode === 'gen1' || s.mode === 'GEN1') {
    pill.classList.add('gen1');
    pill.innerText = `● Gen-1 (${s.id})`;
    desc.innerText = s.message || `${s.title}: Локальное парирование без остановки добычи.`;
  } else {
    pill.classList.add('gen2');
    pill.innerText = `● Gen-2 АВАРИЯ (${s.id})`;
    desc.innerText = s.message || `${s.title}: Активирован резервный контур защиты!`;
  }
}

async function fetchFleetAndTelemetry() {
  try {
    const res = await fetch('/api/openegiz/fleet');
    if (!res.ok) return;
    const data = await res.json();
    if (data.fleet && data.fleet.length > 0) fleetData = data.fleet;
    if (data.scenario) updateScenarioUI(data.scenario);
  } catch (e) {}
}
setInterval(fetchFleetAndTelemetry, 1000);
fetchFleetAndTelemetry();

async function fetchAllTwins() {
  try {
    const res = await fetch('/api/openegiz/twins/all');
    if (res.ok) {
      const data = await res.json();
      allTwinsList = Object.keys(data.twins).map(k => data.twins[k]);
      const el = document.getElementById('footer-ditto-twins');
      if (el) el.innerText = `${data.count || 24} Twins Online`;
    }
  } catch (e) {}
}
fetchAllTwins();
"""

combined_js = f"""
/* ============================================================================
 * SMART-KENISH 4.0 — 2.5D ISOMETRIC SCADA ENGINE (OPEN-PIT COPPER MINE)
 * Orchestrated by Antigravity (Chief Architect)
 * Generated by DeepSeek Subagents (Alpha: Terrain, Beta: Equipment, Gamma: X6 HUD)
 * Pure Native HTML5 Canvas 2D · Zero External CDN · 60 FPS CPU Friendly
 * ============================================================================ */

{alpha_clean}

{clean_b1}

{clean_b2}

{clean_gamma}

{glue_code}
"""

with open("/tmp/deepseek_final_engine.js", "w", encoding="utf-8") as f:
    f.write(combined_js)

res = subprocess.run(["node", "-c", "/tmp/deepseek_final_engine.js"], capture_output=True, text=True)
if res.returncode == 0:
    print("SUCCESS: Combined Engine JavaScript syntax is 100% VALID!")
else:
    print("Syntax Error in Combined Engine:\n", res.stderr)
    sys.exit(1)

# Now inject into public/index.html with approved HUD and Inspector
# Get approved HTML layout from commit db9bd79
proc = subprocess.run(["git", "show", "db9bd79:public/index.html"], capture_output=True, text=True)
approved_html = proc.stdout

# Replace <script> section with the new unified DeepSeek final engine
script_pat = r'(<script>)(.*?)(</script>)'
m = re.search(script_pat, approved_html, flags=re.DOTALL)
if not m:
    print("Error: Could not find <script> in approved HTML")
    sys.exit(1)

final_html = approved_html[:m.start(1)] + "<script>\n" + combined_js + "\n  </script>" + approved_html[m.end(3):]

with open("public/index.html", "w", encoding="utf-8") as f:
    f.write(final_html)

print(f"Successfully integrated final DeepSeek SCADA engine into public/index.html ({len(final_html)} bytes)!")
