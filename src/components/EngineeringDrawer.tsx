import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Truck,
  Pickaxe,
  Factory,
  Layers,
  Database,
  CheckCircle2,
  Terminal,
  Activity,
  TrendingUp,
  Gauge,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import {
  buildDittoProtocolEnvelope,
  CAD_ASSEMBLIES,
  CameraTargetId,
  computeOpenEgizMineMap,
  MineModuleId,
} from '../domain/canyonLogic';
import { LiveSceneTelemetry } from './CanyonViewport3D';

interface EngineeringDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: LiveSceneTelemetry;
  onFocusTruck: (truckIndex: number) => void;
  onSelectCameraTarget: (target: CameraTargetId) => void;
  initialTab?: 'scada_terminal' | 'openegiz_modules' | 'ditto_twins' | 'cad_specs';
}

export function EngineeringDrawer({
  isOpen,
  onClose,
  telemetry,
  onFocusTruck,
  onSelectCameraTarget,
  initialTab = 'scada_terminal',
}: EngineeringDrawerProps) {
  const [activeTab, setActiveTab] = useState<
    'scada_terminal' | 'openegiz_modules' | 'ditto_twins' | 'cad_specs'
  >(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [selectedModuleId, setSelectedModuleId] =
    useState<MineModuleId>('transport_dispatch');
  const [selectedTwinId, setSelectedTwinId] = useState<string>(
    'org.openegiz:belaz-75131-01'
  );

  const [terminalView, setTerminalView] = useState<string>('overview');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [terminalLoading, setTerminalLoading] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [terminalScada, setTerminalScada] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchTerminalData = useCallback(async (view: string = terminalView) => {
    setTerminalLoading(true);
    try {
      const [viewRes, scadaRes] = await Promise.all([
        fetch(`/api/terminal/view?view=${view}`),
        fetch('/api/terminal/scada'),
      ]);
      const viewData = await viewRes.json();
      const scadaJson = await scadaRes.json();
      if (viewData?.plainText) {
        setTerminalOutput(viewData.plainText);
      }
      if (scadaJson) {
        setTerminalScada(scadaJson);
      }
    } catch (err) {
      console.error('Failed to load terminal data:', err);
    } finally {
      setTerminalLoading(false);
    }
  }, [terminalView]);

  useEffect(() => {
    if (activeTab === 'scada_terminal') {
      fetchTerminalData(terminalView);
    }
  }, [activeTab, terminalView, fetchTerminalData]);

  const handleCopyCommand = (cmd: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  if (!isOpen) return null;

  const flagshipTruck = telemetry.belazFleet[0];
  const { modules, twins } = computeOpenEgizMineMap(24.0, 1.0);
  const activeModule =
    modules.find((m) => m.id === selectedModuleId) ?? modules[0];
  const activeTwin =
    twins.find((t) => t.thingId === selectedTwinId) ?? twins[1];
  const dittoEnvelope = buildDittoProtocolEnvelope(activeTwin, 24.0);


  const wheelLabels: Record<string, string> = {
    FL: 'Переднее левое (рулевое)',
    FR: 'Переднее правое (рулевое)',
    RLO: 'Заднее левое внешнее',
    RLI: 'Заднее левое внутреннее',
    RRI: 'Заднее правое внутреннее',
    RRO: 'Заднее правое внешнее',
  };

  return (
    <dialog
      open
      aria-label="Карта рудника OpenEgiz, двойники Eclipse Ditto и CAD-реестр"
      className="fixed inset-0 z-40 m-0 w-full h-full bg-black/70 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-6xl max-h-[88vh] bg-[#0e1420] border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Цифровой рудник на платформе OpenEgiz · Карта Модулей и CAD-Реестр
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              7 Модулей Карты + Свой Модуль (№08) · Иерархия Eclipse Ditto (_parents) · MQTT (telemetry/&lt;двойник&gt;) · Telegraf → InfluxDB
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('scada_terminal')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'scada_terminal'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-cyan-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>SCADA Терминал & P&L</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('openegiz_modules')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'openegiz_modules'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Карта рудника (8 Модулей)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ditto_twins')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'ditto_twins'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Двойники Ditto и MQTT
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cad_specs')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'cad_specs'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                6-Колёсная Физика и CAD
              </button>

            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть инженерный реестр"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'scada_terminal' && (
            <div className="space-y-6">
              {/* Top Banner: Enterprise Operations & Unified Architecture */}
              <div className="bg-[#0b101c] border border-cyan-500/30 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      ГОК «АҚТАУ-МЫС» · ЕДИНЫЙ ЦЕНТР ОПЕРАЦИЙ SCADA & 3D ЦИФРОВОЙ РУДНИК
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-mono-tabular font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                      17 ДВОЙНИКОВ · 1 ФЛАГМАН БЕЛАЗ-75131
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    БЕЛАЗ-75131 #01 — на линии (3D Live: 6-колёсная кинематика, пантограф 1200В).
                    Борта #02..#08 — вскрышной комплекс горизонта +18 м и депо (телеметрия OpenEgiz MQTT).
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchTerminalData(terminalView)}
                    disabled={terminalLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${terminalLoading ? 'animate-spin text-cyan-400' : ''}`} />
                    <span>Обновить телеметрию</span>
                  </button>
                </div>
              </div>

              {/* 4 Core SCADA Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Financial P&L & Enterprise */}
                <div className="bg-[#101726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Экономика ГОКа (P&L)
                    </span>
                    <span className="font-mono-tabular text-emerald-300 font-bold">10y @ 10%</span>
                  </div>
                  <div className="space-y-2 font-mono-tabular text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">NPV (Чистая привед.):</span>
                      <span className="text-emerald-400 font-bold text-sm">+$18.42M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">IRR / Окупаемость:</span>
                      <span className="text-cyan-300 font-semibold">68.0% / 1.26 года</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Себестоимость OPEX:</span>
                      <span className="text-emerald-300 font-semibold">$0.98 / т (-32%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Содержание руды Cu:</span>
                      <span className="text-amber-300 font-semibold">0.850% (Цель 0.850%)</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>Режим ГОК:</span>
                      <span className="text-emerald-400 font-medium">Шихтовка PID активна</span>
                    </div>
                  </div>
                </div>

                {/* 2. Flagship BelAZ-75131 Telemetry */}
                <div className="bg-[#101726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" />
                      БелАЗ-75131 #01 (136т)
                    </span>
                    <span className="font-mono-tabular text-amber-300 font-bold">Флагман</span>
                  </div>
                  <div className="space-y-2 font-mono-tabular text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Троллейная тяга:</span>
                      <span className="text-amber-400 font-bold">⚡ 1200В DC (В сети)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Полезная руда Cu-Mo:</span>
                      <span className="text-white font-semibold">130.0 т (Номинал 136т)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Скорость на уклоне 10%:</span>
                      <span className="text-cyan-300 font-semibold">25.7 км/ч (PK 1.23 км)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Расход дизтоплива:</span>
                      <span className="text-emerald-400 font-semibold">24.5 л/ч (-82.7%)</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>Стойки ЦП / Тормоз ISO:</span>
                      <span className="text-emerald-400 font-medium">16.4 МПа · 13.4 м (μ=0.65)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Comminution & Continuous Flow */}
                <div className="bg-[#101726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Factory className="w-4 h-4" />
                      Рудопоток & ГОК
                    </span>
                    <span className="font-mono-tabular text-cyan-300 font-bold">2,400 т/ч</span>
                  </div>
                  <div className="space-y-2 font-mono-tabular text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Дробилка ККД-1500:</span>
                      <span className="text-white font-bold">2,400 т/ч (F80=165мм)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Магистральная лента:</span>
                      <span className="text-cyan-300 font-semibold">2,400 т/ч · 281.0 кН</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Склад руды (Буфер):</span>
                      <span className="text-amber-300 font-semibold">28,515 т (Живой объем)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Мельница МПСИ-90:</span>
                      <span className="text-emerald-400 font-semibold">5,520 кВт (БРП 14 МВт)</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>Флотация Cu / Концентрат:</span>
                      <span className="text-emerald-400 font-medium">90.5% извлеч. · 24.8% Cu</span>
                    </div>
                  </div>
                </div>

                {/* 4. Geotech & Mine Hydrogeology */}
                <div className="bg-[#101726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Геотехника & Зумпф
                    </span>
                    <span className="font-mono-tabular text-emerald-400 font-bold">FoS 1.36</span>
                  </div>
                  <div className="space-y-2 font-mono-tabular text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Устойчивость откоса FoS:</span>
                      <span className="text-emerald-400 font-bold">1.36 (Норма ≥ 1.30)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Поровое давление воды:</span>
                      <span className="text-white font-semibold">56.3 кПа</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Скорость деформации v:</span>
                      <span className="text-cyan-300 font-semibold">0.12 мм/ч (Фукудзоно)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Дренажный зумпф (-60м):</span>
                      <span className="text-cyan-400 font-semibold">1.15 м (Откачка 48 м³/ч)</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>Вентиляция ВСП-1800:</span>
                      <span className="text-sky-400 font-medium">148 м³/с · PM10 18 мкг/м³</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live TUI Terminal Screen Emulator */}
              <div className="bg-[#060a12] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                {/* Terminal Window Header Bar */}
                <div className="bg-[#0b101a] px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-300 ml-2">
                      terminal://smart-kenish.scada/hmi-console (team/monitor.py)
                    </span>
                  </div>

                  {/* Terminal View Switcher Pills */}
                  <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
                    {[
                      { id: 'overview', label: 'Обзор SCADA' },
                      { id: '1', label: '1. Поток руды' },
                      { id: '2', label: '2. Флагман БелАЗ' },
                      { id: '3', label: '3. Фабрика & МПСИ' },
                      { id: '4', label: '4. Геотехника' },
                      { id: '5', label: '5. EKF-PID' },
                      { id: '6', label: '6. 17 Двойников' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setTerminalView(v.id);
                          fetchTerminalData(v.id);
                        }}
                        className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-[11px] ${
                          terminalView === v.id
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Terminal Monospace Body */}
                <div className="p-4 bg-[#050811] text-slate-200 overflow-x-auto min-h-[380px] font-mono text-xs sm:text-[13px] leading-relaxed selection:bg-cyan-500 selection:text-black">
                  {terminalLoading && !terminalOutput ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Подключение к терминальному сокету SCADA...</span>
                    </div>
                  ) : terminalOutput ? (
                    <pre className="whitespace-pre overflow-x-auto font-mono text-slate-100">
                      {terminalOutput}
                    </pre>
                  ) : (
                    <div className="text-slate-500 italic py-10 text-center">
                      Нажмите кнопку для подключения к терминальной консоли.
                    </div>
                  )}
                </div>

                {/* Terminal Quick CLI Execution Bar */}
                <div className="bg-[#0b101a] px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-emerald-400 font-bold">$</span>
                    <span>Команды терминала:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCommand('python3 team/monitor.py')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition-colors"
                    >
                      {copiedCmd === 'python3 team/monitor.py' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                      <span>python3 team/monitor.py</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyCommand('bash scripts/zhinaushy-verify.sh')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] transition-colors"
                    >
                      {copiedCmd === 'bash scripts/zhinaushy-verify.sh' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                      <span>bash scripts/zhinaushy-verify.sh</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'openegiz_modules' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: List of 8 Modules (7 Core + 1 Custom) */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
                  Перечень Модулей (Глубина проработки + Свой Модуль)
                </div>
                {modules.map((mod) => {
                  const isSelected = mod.id === activeModule.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setSelectedModuleId(mod.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/70 text-white'
                          : 'bg-[#131b2b] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-amber-400">
                            Модуль {mod.number}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              mod.category === 'Свой Модуль'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {mod.category}
                          </span>
                        </div>
                        <div className="text-xs font-semibold mt-1 leading-snug">
                          {mod.title}
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Detailed Module Passport, Ditto Things, MQTT Topics & Stand Verification */}
              <div className="lg:col-span-7 bg-[#131b2b] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono-tabular font-bold text-amber-400">
                          МОДУЛЬ {activeModule.number} · {activeModule.category.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white mt-1">
                        {activeModule.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectCameraTarget(activeModule.cameraTarget);
                        onClose();
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Показать работу на Стенде в 3D →
                    </button>
                  </div>

                  {/* Real Mining Purpose & Applied Algorithm */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300">
                      Назначение в производстве и прикладная логика Команды:
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {activeModule.summary}
                    </p>
                    <div className="p-3 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs text-amber-200/90 leading-relaxed">
                      <span className="font-semibold text-amber-400">
                        Алгоритм сервиса OpenEgiz:{' '}
                      </span>
                      {activeModule.activeAlgorithm}
                    </div>
                  </div>

                  {/* Live KPIs Grid */}
                  <div>
                    <div className="text-xs font-semibold text-slate-300 mb-2">
                      Оперативные показатели Модуля (телеметрия Ditto / InfluxDB):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeModule.kpis.map((kpi) => (
                        <div
                          key={kpi.label}
                          className="p-2.5 bg-[#0b0f17] border border-slate-800 rounded-lg flex flex-col justify-between"
                        >
                          <span className="text-[11px] text-slate-400">
                            {kpi.label}
                          </span>
                          <span className="text-xs font-mono-tabular font-semibold text-emerald-400 mt-1">
                            {kpi.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* OpenEgiz Platform Integration Details (Ditto Things, MQTT, InfluxDB) */}
                  <div className="p-3.5 bg-[#0b0f17] border border-slate-800 rounded-lg space-y-2 text-xs font-mono-tabular">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-400 font-sans">
                        Двойники Eclipse Ditto (Things):
                      </span>
                      <span className="text-sky-400">
                        {activeModule.dittoThings.join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-400 font-sans">
                        Топики MQTT (Ditto Protocol):
                      </span>
                      <span className="text-amber-300">
                        {activeModule.mqttTopics.join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-400 font-sans">
                        Таблица истории Telegraf → InfluxDB:
                      </span>
                      <span className="text-emerald-400">
                        {activeModule.influxMeasurement}
                      </span>
                    </div>
                  </div>

                  {/* Verification Steps for SUBMISSION.md */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-300">
                      Как проверяющий может увидеть работу Модуля на Стенде (SUBMISSION.md):
                    </div>
                    {activeModule.submissionVerifySteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ditto_twins' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Hierarchy of Eclipse Ditto Things (_parents) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Иерархия двойников Eclipse Ditto (_parents)
                </div>
                {twins.map((tw) => {
                  const isRoot = tw.attributes._parents.length === 0;
                  const isSelected = tw.thingId === activeTwin.thingId;
                  return (
                    <button
                      key={tw.thingId}
                      type="button"
                      onClick={() => setSelectedTwinId(tw.thingId)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isRoot ? '' : 'ml-3 w-[calc(100%-0.75rem)]'
                      } ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-500/70 text-white'
                          : 'bg-[#131b2b] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular text-xs font-bold text-sky-400">
                          {tw.thingId}
                        </span>
                        <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                      <div className="text-xs font-semibold mt-1">
                        {tw.attributes.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-tabular mt-1">
                        _parents:{' '}
                        {tw.attributes._parents.length > 0
                          ? JSON.stringify(tw.attributes._parents)
                          : '[] (Корневой узел рудника)'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Live Ditto Thing State & MQTT Ditto Protocol Payload */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 bg-[#131b2b] border border-slate-800 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Состояние цифровой вещи в Eclipse Ditto
                      </h3>
                      <p className="text-xs text-slate-400 font-mono-tabular">
                        thingId: {activeTwin.thingId} · Горизонт: {activeTwin.attributes.locationBenchM} м
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-mono-tabular bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 rounded">
                      MQTT: {activeTwin.mqttTopic}
                    </span>
                  </div>

                  <pre className="p-3.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono-tabular text-sky-200 overflow-x-auto leading-relaxed">
                    {JSON.stringify(activeTwin, null, 2)}
                  </pre>
                </div>

                <div className="p-4 bg-[#131b2b] border border-slate-800 rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-semibold text-amber-400">
                      Пакет протокола Ditto в MQTT ({dittoEnvelope.mqttTopic}) → Telegraf → InfluxDB
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono-tabular">
                      application/vnd.eclipse.ditto+json
                    </span>
                  </div>
                  <pre className="p-3.5 bg-[#0b0f17] border border-slate-800 rounded-lg text-xs font-mono-tabular text-amber-200 overflow-x-auto leading-relaxed">
                    {JSON.stringify(dittoEnvelope, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cad_specs' && (
            <>
              {/* Top 3 Equipment Summary Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-[#131b2b] border border-slate-800 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-amber-400">
                        01. Флагманский БелАЗ-75131 (1 ед.)
                      </h3>
                      <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Детальная CAD-сборка: W-кузов с 7 контрфорсами и козырьком FOPS/ROPS, 6 шин с грунтозацепами «ёлочка», 4 пневмогидростойки, качающийся задний мост, вентилятор KTA-50 и пантограф 1200В.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                    <span>
                      Уклон: {flagshipTruck ? `${flagshipTruck.gradePercent}%` : '0%'} · Крен: {flagshipTruck ? `${flagshipTruck.bankAngleDeg}°` : '0°'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onFocusTruck(0);
                        onClose();
                      }}
                      className="text-amber-400 hover:underline font-sans font-medium"
                    >
                      Следить в 3D →
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#131b2b] border border-slate-800 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-sky-400">
                        02. Экскаваторы ЭКГ-15 и CAT 6020B
                      </h3>
                      <Pickaxe className="w-4 h-4 text-sky-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Многоопорные гусеницы с катками, А-образные пилоны, стальные вантовые канаты Ø64 мм ({telemetry.ekg15.ropeTensionKn} кН), откидное днище ковша и 5 кованых марганцовистых зубьев 110Г13Л.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                    <span>ЭКГ-15: 15 м³ · CAT: 12 м³</span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCameraTarget('excavators');
                        onClose();
                      }}
                      className="text-sky-400 hover:underline font-sans font-medium"
                    >
                      Показать в 3D →
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#131b2b] border border-slate-800 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-emerald-400">
                        03. Корпус ГОК · ККД-1500 · МПСИ-90 · Флотация
                      </h3>
                      <Factory className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Портал со светофором, дробилка ККД-1500, наклонная конвейерная галерея, мостовой кран 50 т, МПСИ-90 ({telemetry.plant.mpsiPowerMw} МВт), 12× гидроциклонов Krebs и 6 чанов пенной флотации.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
                    <span>Извлечение Cu-Mo: {telemetry.plant.flotationRecoveryPct}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCameraTarget('processing_plant');
                        onClose();
                      }}
                      className="text-emerald-400 hover:underline font-sans font-medium"
                    >
                      Показать в 3D →
                    </button>
                  </div>
                </div>
              </div>

              {/* Live 6-Wheel Contact & Hydro-Pneumatic Strut Telemetry Table */}
              {flagshipTruck && (
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-[#131b2b] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Телеметрия 6 колёс и пневмогидравлической подвески: {flagshipTruck.id} ({flagshipTruck.interactingWith || flagshipTruck.phaseLabel})
                    </span>
                    <div className="flex items-center gap-3 text-xs text-slate-300 font-mono-tabular">
                      <span>Уклон: {flagshipTruck.gradePercent}%</span>
                      <span>·</span>
                      <span>Крен виража: {flagshipTruck.bankAngleDeg}°</span>
                      <span>·</span>
                      <span>Груз: {flagshipTruck.oreLoadTons} / 136 т</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-[#0b0f17]">
                          <th className="py-2.5 px-3 font-medium">Колесо (59/80R63)</th>
                          <th className="py-2.5 px-3 font-medium">Координаты контакта (X, Z)</th>
                          <th className="py-2.5 px-3 font-medium">Высота асфальта (Y)</th>
                          <th className="py-2.5 px-3 font-medium">Ход сжатия стойки ЦП</th>
                          <th className="py-2.5 px-3 font-medium">Длина штока</th>
                          <th className="py-2.5 px-3 font-medium text-right">Статус узла</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70 font-mono-tabular">
                        {flagshipTruck.wheelContacts.map((wc) => (
                          <tr
                            key={wc.id}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-2 px-3 font-semibold text-amber-400 font-sans">
                              {wc.id} · {wheelLabels[wc.id] || wc.id}
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              ({wc.worldX} м, {wc.worldZ} м)
                            </td>
                            <td className="py-2 px-3 text-slate-200">
                              {wc.worldY} м
                            </td>
                            <td className="py-2 px-3 text-slate-200">
                              {Math.round(wc.suspensionCompressionM * 100)} см
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              {wc.strutLengthM.toFixed(2)} м
                            </td>
                            <td className="py-2 px-3 text-right font-sans text-emerald-400">
                              Контакт с асфальтом
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed CAD Sub-Assemblies Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    'belaz_fleet',
                    'excavators',
                    'drilling_rig',
                    'processing_plant',
                    'trolley_ramp',
                  ] as CameraTargetId[]
                ).map((key) => {
                  const spec = CAD_ASSEMBLIES[key];
                  return (
                    <div
                      key={key}
                      className="p-4 bg-[#131b2b] border border-slate-800 rounded-lg"
                    >
                      <h4 className="text-xs font-semibold text-white">
                        {spec.title}
                      </h4>
                      <ul className="mt-2 space-y-1 text-xs text-slate-300">
                        {spec.cadPrimitives.map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}


        </div>
      </div>
    </dialog>
  );
}
