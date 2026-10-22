# Deployment & Execution Guide

## Smart-Kenish 4.0: Autonomous Green Mine (Team-018)

> Цифровой двойник открытого полиметаллического карьера «Ақтау-Мыс» на платформе OpenEgiz: троллейвозная декарбонизация, динамическая шихтовка руды 0.850% Cu, предиктивная термодинамика шин (TKPH) и двухуровневые вероятностные сценарии «What-if» (Gen-1 / Gen-2).

Проект разработан командой **Team-018** для конкурса «OpenEgiz Цифрлық кеніші». Решение интегрировано в платформу OpenEgiz v1.0.3 и разворачивается полностью автоматически без вмешательства человека (Unattended Cold-Start).

---

## Prerequisites & Clean Environment Setup (Ubuntu 24.04 LTS)

В чистом окружении стенда Жинаушы (Ubuntu 24.04.5 LTS, 8 vCPU, 16 GB RAM, без GPU) установка базовых утилит и развертывание выполняются полностью автономно (Unattended, zero prompts):

```bash
# 0. Обязательная установка системных зависимостей (выполняется первой командой):
sudo apt-get update && sudo apt-get install -y make curl jq
```

- Docker Engine 24.0+ & Docker Compose v2 (поддерживается `docker compose`)
- Сетевая архитектура: все сервисы взаимодействуют исключительно по **IPv4 (`127.0.0.1` / `localhost`)** и во внутренней сети Docker bridge (IPv6 отключен).
- Порты: 8080 (Eclipse Ditto), 1883/9001 (MQTT), 3000 (Grafana), 3001 (Headless API).

---

## Quickstart (Single-Command Run)

```bash
# 0. Подготовка окружения чистой VM (Ubuntu 24.04 LTS без make/curl/jq)
sudo apt-get update && sudo apt-get install -y make curl jq

# 1. Non-interactive setup of environment & credentials
bash scripts/compose-env.sh

# 2. Start OpenEgiz Platform & Smart-Kenish 4.0 Digital Twin
docker compose up -d --build
```

---

## Verification & Health Check

```bash
# Verify health of Eclipse Ditto and the Stand
until curl -sf http://localhost:8080/health >/dev/null; do sleep 3; done
curl -f http://localhost:8080/health || exit 1
```

---

## Data Sources & Trace-Driven Physics (/ru/data/)

Все используемые наборы данных рекомендованы организаторами конкурса ([`https://openegiz-contest.github.io/ru/data/`](https://openegiz-contest.github.io/ru/data/)), являются **100% лицензионно чистыми** (CC0 / CC BY 4.0 / MIT) и сохранены локально в `team/data/reference_traces/` для автономной работы в изолированной VM:

1. **Флотация (Quality Prediction in a Mining Process, CC0):** профили кремния, железа, pH и плотности пульпы для `sag-mill-01` и EKF-фильтра в `grade_blending_controller.py`.
2. **Энергетика (Energy consumption of mining and processing plant, Zenodo 20647907, CC BY 4.0):** промышленный профиль базовой нагрузки и частоты сети для `substation-01` и пикового сглаживания BESS 2 МВт·ч (`trolley_energy_manager.py`).
3. **Сейсмика и MWD (Seismic Bumps UCI & Zenodo 10358374, CC BY 4.0):** энергия микросейсмических событий и удельная энергия бурения SED для устойчивости борта $FoS$ (`slope-radar-01`) и индекса Бонда $W_i(t)$ (`drill-rig-01`).
4. **Рудничная атмосфера (Mine Atmosphere Mendeley Data, CC BY 4.0):** временные ряды PM10, CO, NOx для адаптивного цикла орошения `water-bowser-01` и уступов `bench-north`/`bench-south`.
5. **OpenMines Dispatch (MIT License):** топология трасс и параметры 8 самосвалов БЕЛАЗ-75131 (`mine_spatial_topology.geojson`).

Полный реестр лицензий и трансформаций см. в [`team/data/DATA_LICENSES.md`](team/data/DATA_LICENSES.md).

---

## Access Points

* OpenEgiz Grafana Dashboard: http://localhost:3000
* Eclipse Ditto REST API: http://localhost:8080
* Mosquitto MQTT Broker: mqtt://localhost:1883 & ws://localhost:9001
* Terminal SCADA / TUI: `make monitor`
* What-If Incident Controller: `make scenarios`

---

## Inspection & Demonstration Commands

```bash
# 1. Автоматизированный 6-этапный шоукейс-тур (все 3 инцидента What-If и предотвращение $9.52M убытков):
make demo

# 2. Живой консольный SCADA-монитор телеметрии 14 двойников в реальном времени:
make monitor

# 3. Комплексный автоматический аудит соответствия регламенту (10/10 проверок):
make verify

# 4. Интерактивное консольное меню инцидентов «What-If»:
make scenarios

# 5. Остановка симулятора (двойники и база данных сохраняются):
make team-mine-stop

# 6. Полная очистка платформы и сброс учетных данных:
make clean
```
