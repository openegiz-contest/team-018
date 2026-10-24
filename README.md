# Smart-Kenish 4.0: Autonomous Green Mine (Team-018)
## «OpenEgiz цифрлық кеніші» байқауына арналған жобалық шешім

[![OpenEgiz Compliant](https://img.shields.io/badge/OpenEgiz-v1.0.3-blue.svg)](https://openegiz-contest.github.io/kk/rules/)
[![Architecture](https://img.shields.io/badge/Architecture-Eclipse_Ditto_+_MQTT-green.svg)](https://www.eclipse.dev/ditto/)
[![Licence](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Verification Suite](https://img.shields.io/badge/Zhinaushy_Audit-39%2F39_Passed-success.svg)](team-018-main/scripts/zhinaushy-verify.sh)

> **Цифровой двойник открытого полиметаллического карьера «Ақтау-Мыс» (12 Mt/a)** на открытой отраслевой платформе OpenEgiz: 24 цифровых двойника в Eclipse Ditto, декарбонизированная троллейвозная откатка 1200В, адаптивная EKF-PID шихтовка руды 0.850% Cu, термодинамика шин по ISO 3450:2011 / TKPH, гидрогеологический баланс горизонта -60м и двухуровневые вероятностные инциденты «What-If» (Gen-1 / Gen-2).

---

## 📑 Жоба құрылымы мен құжаттамасы (Navigation)

Барлық ресми конкурстық материалдар мен орындалатын код `team-018-main/` каталогында шоғырланған:

- 📄 **Негізгі конкурстық өтінім / Манифест:** [`team-018-main/SUBMISSION.md`](team-018-main/SUBMISSION.md) *(Тұжырымдама, Деректер мен жорамалдар, Модульдер, «What-If» сценарийлері)*
- 📊 **Презентация (PDF):** [`team-018-main/presentation.pdf`](team-018-main/presentation.pdf) *(10 беттік векторлық презентация, PDF 1.4)*
- ⚖️ **Лицензия:** [`LICENSE`](LICENSE) *(MIT License, Team-018)*
- 🚀 **Орындау және орналастыру нұсқаулығы:** [`team-018-main/README.md`](team-018-main/README.md)
- 📐 **Двойниктер онтологиясы (24 Twins):** [`team-018-main/docs/TWINS_ONTOLOGY.md`](team-018-main/docs/TWINS_ONTOLOGY.md)
- 🔬 **Физика-математикалық спецификация:** [`team-018-main/docs/PHYSICAL_MODEL.md`](team-018-main/docs/PHYSICAL_MODEL.md)
- 📈 **Базалық үлгіден артықшылық манифесі:** [`team-018-main/docs/BASELINE_COMPARISON.md`](team-018-main/docs/BASELINE_COMPARISON.md)

---

## 🚀 Бір пәрменмен іске қосу (Single-Command Quickstart)

Стенд талаптарына сәйкес цифрлық егіз толық автоматты түрде (Unattended Cold-Start) іске қосылады:

```bash
# 0. Таза VM ортасын дайындау (Ubuntu 24.04 LTS без make/curl/jq)
sudo apt-get update && sudo apt-get install -y make curl jq

# 1. Жұмыс каталогына өту
cd team-018-main

# 2. Орта айнымалыларын баптау (Non-interactive)
bash scripts/compose-env.sh

# 3. OpenEgiz платформасы мен симуляторды көтеру
docker compose up -d --build
```

### Стенд денсаулығын тексеру (Healthcheck):
```bash
until curl -sf http://localhost:8080/health >/dev/null; do sleep 3; done
curl -f http://localhost:8080/health && echo "OpenEgiz Stand is Healthy!"
```

---

## 🔬 Data Sources & Trace-Driven Physics (/ru/data/)

Барлық қолданылатын эталондық деректер жиындары ұйымдастырушылар тарапынан ұсынылған ([`https://openegiz-contest.github.io/ru/data/`](https://openegiz-contest.github.io/ru/data/)), **100% лицензиялық таза** (CC0 / CC BY 4.0 / MIT) және толық автономды орындалу үшін `team/data/reference_traces/` каталогында сақталған:

1. **Флотация (Quality Prediction in a Mining Process, CC0):** кремний, темір, pH және пульпа тығыздығы профильдері `sag-mill-01` мен EKF-сүзгісі үшін (`grade_blending_controller.py`).
2. **Энергетика (Energy consumption of mining and processing plant, Zenodo 20647907, CC BY 4.0):** подстанцияның базалық жүктемесі мен желі жиілігі `substation-01` мен BESS 2 МВт·сағ үшін (`trolley_energy_manager.py`).
3. **Сейсмика және MWD (Seismic Bumps UCI & Zenodo 10358374, CC BY 4.0):** микросейсмикалық серпілістер мен бұрғылаудың меншікті энергиясы (SED) борт орнықтылығы $FoS$ (`slope-radar-01`) мен Бонд индексі $W_i(t)$ (`drill-rig-01`) үшін.
4. **Рудниктік атмосфера (Mine Atmosphere Mendeley Data, CC BY 4.0):** PM10, CO, NOx қатарлары су шашқыш `water-bowser-01` мен кертпештерді (`bench-north`/`bench-south`) шаңсыздандыру циклі үшін.
5. **OpenMines Dispatch (MIT License):** жол торы мен 8 самосвалдың қозғалыс параметрлері (`mine_spatial_topology.geojson`).

Толық лицензиялық манифест: [`team-018-main/team/data/DATA_LICENSES.md`](team-018-main/team/data/DATA_LICENSES.md).

---

## 🖥️ Қолжетімділік нүктелері (Endpoints)

| Сервис | Порт / URL | Сипаттамасы |
| :--- | :--- | :--- |
| **3D Digital Twin WebGL Cockpit** | [http://localhost:5173](http://localhost:5173) | 3D-двойник ГОК (Three.js): 24 егіз, троллей 1200В, What-If HUD, FoS теплокарта (CPU 60 FPS) |
| **Grafana SCADA Dashboard** | [http://localhost:3000](http://localhost:3000) *(admin/admin)* | 40 талдау панелі, 3D визуал эмбеді, FMS матрицасы, P&L қаржылық көрсеткіштері |
| **Eclipse Ditto REST API** | [http://localhost:8080](http://localhost:8080) | 24 цифрлық егіз (`/api/2/things`), ABAC қауіпсіздік саясаты |
| **Mosquitto MQTT Broker** | `mqtt://localhost:1883` & `ws://localhost:9001` | Нақты уақыттағы телеметрия ағыны (`telemetry/#`) |
| **Terminal SCADA Monitor (TUI)**| `make monitor` *(немесе `python3 team/monitor.py`)* | 24-биттік консольдік SCADA, 6 режим, физикалық теңдеулер инспекторы |
| **Headless REST API** | [http://localhost:3001/](http://localhost:3001/) | Сандық егіздер күйі мен геокеңістіктік GIS бағыттарын беретін REST API |

---

## 🔬 Автоматтандырылған тестілеу және аудит

Жоба конкурстық комиссияның (Жинаушы / Zhinaushy) барлық талаптарына 100% сәйкес келеді:

```bash
# Регламент талаптарына сәйкестікті автоматты тексеру (22/22 тексеру)
make -C team-018-main verify

# Симулятордың бірлік сынақтары (13/13 тест)
python3 team-018-main/team/test_kenish_core.py

# Домендік логика мен API тестілері
npm test
```

---

## ⚡ «What-If» оқиғаларын басқару

Интерактивті оқиғалар сценарийін терминалдан орындау:

```bash
# 1-сценарий: Троллей желісіндегі апат (1200В үзілуі)
bash team-018-main/scripts/trigger_scenario.sh trolley-fault gen1
bash team-018-main/scripts/trigger_scenario.sh trolley-fault revert

# 2-сценарий: Ұнтақтағышқа тістің түсуі (ККД-1500)
bash team-018-main/scripts/trigger_scenario.sh crusher-fault gen2
bash team-018-main/scripts/trigger_scenario.sh crusher-fault revert

# 3-сценарий: -60м горизонтындағы су ағыны
bash team-018-main/scripts/trigger_scenario.sh water-influx gen1
bash team-018-main/scripts/trigger_scenario.sh water-influx revert
```
