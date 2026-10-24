import React, { useState, useEffect } from 'react';
import {
  type TwinInspectionDetails,
} from '../domain/twinRegistry';
import {
  X,
  Copy,
  Check,
  Eye,
  Activity,
  Cpu,
  FileCode,
  ShieldAlert,
  Zap,
  Truck,
  Layers,
  Radio,
  Droplets,
  HardHat,
  Factory,
} from 'lucide-react';

interface TwinInspectorModalProps {
  details: TwinInspectionDetails;
  onClose: () => void;
  onFocusCamera: (pos: [number, number, number], offset: [number, number, number]) => void;
  onSelectTruckIndex?: (truckIndex: number) => void;
  onOpenDittoCatalog?: () => void;
}

export function TwinInspectorModal({
  details,
  onClose,
  onFocusCamera,
  onSelectTruckIndex,
  onOpenDittoCatalog,
}: TwinInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'passport' | 'ditto'>('telemetry');
  const [copied, setCopied] = useState(false);

  // Keyboard shortcut: ESC closes the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(details.dittoJson, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('транспорт')) return <Truck className="w-4 h-4 text-amber-400" />;
    if (category.includes('Выем')) return <HardHat className="w-4 h-4 text-emerald-400" />;
    if (category.includes('Дробл') || category.includes('Обогащ') || category.includes('Измельч'))
      return <Factory className="w-4 h-4 text-cyan-400" />;
    if (category.includes('Энерг')) return <Zap className="w-4 h-4 text-amber-400" />;
    if (category.includes('Геотехн') || category.includes('Радар')) return <Radio className="w-4 h-4 text-cyan-400" />;
    if (category.includes('Водоот') || category.includes('Эколог')) return <Droplets className="w-4 h-4 text-sky-400" />;
    return <Layers className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div
      data-testid="universal-twin-inspector-modal"
      className="fixed bottom-4 left-4 z-40 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-cyan-500/40 bg-[#070c18]/95 p-4 shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-slate-100 pointer-events-auto animate-in fade-in slide-in-from-bottom-2 duration-150 flex flex-col max-h-[82vh]"
    >
      {/* 1. Header with Name, Badge, URN & Close Button */}
      <div className="flex items-start justify-between pb-2.5 mb-2.5 border-b border-slate-800/80 gap-2 shrink-0">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-inner shrink-0">
            {getCategoryIcon(details.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono-tabular px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {details.typeBadge}
              </span>
              <span className="text-[9px] font-mono-tabular text-slate-400 truncate">
                {details.twinId}
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white truncate mt-1">
              {details.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[9px] font-mono-tabular px-2 py-0.5 rounded-full border font-semibold ${details.statusColor}`}>
            {details.status}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Закрыть инспектор (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 1B. Quick Truck Tabs (if viewing a BelAZ truck) */}
      {details.truckIndex !== undefined && onSelectTruckIndex && (
        <div className="flex items-center gap-1 pb-2 mb-2 overflow-x-auto border-b border-slate-800/60 scrollbar-none shrink-0">
          <span className="text-[9px] text-slate-400 uppercase font-mono-tabular font-bold mr-1">
            Флот:
          </span>
          {Array.from({ length: 8 }).map((_, idx) => {
            const isSelected = details.truckIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTruckIndex(idx)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-tabular font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900/90 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                #{String(idx + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Sleek Tab Navigation */}
      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800/60 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono-tabular font-bold transition-all ${
            activeTab === 'telemetry'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Телеметрия ({details.metrics.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('passport')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono-tabular font-bold transition-all ${
            activeTab === 'passport'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Паспорт CAD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ditto')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono-tabular font-bold transition-all ${
            activeTab === 'ditto'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Ditto JSON</span>
        </button>
      </div>

      {/* 3. Main Body Content (Scrollable) */}
      <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[160px] max-h-[46vh] scrollbar-thin scrollbar-thumb-slate-700">
        {/* TAB 1: Live Telemetry */}
        {activeTab === 'telemetry' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-tabular">
              {details.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/80 flex flex-col justify-between"
                >
                  <span className="text-[10px] text-slate-400 block truncate">{m.label}:</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-extrabold text-white text-xs">
                      {m.value}
                    </span>
                    {m.unit && (
                      <span className="text-[10px] text-cyan-400 ml-1 font-semibold">{m.unit}</span>
                    )}
                  </div>
                  {m.progressPct !== undefined && (
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          m.status === 'warn'
                            ? 'bg-amber-400'
                            : m.status === 'crit'
                            ? 'bg-rose-500'
                            : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.max(4, Math.min(100, m.progressPct))}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
              {details.description}
            </p>
          </div>
        )}

        {/* TAB 2: Equipment CAD Passport */}
        {activeTab === 'passport' && (
          <div className="space-y-3">
            {details.specifications.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <div className="text-[10px] uppercase font-mono-tabular font-bold text-slate-400 px-1">
                  {group.group}
                </div>
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/80 space-y-1.5">
                  {group.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="flex items-center justify-between text-[11px] font-mono-tabular py-0.5 border-b border-slate-800/40 last:border-b-0"
                    >
                      <span className="text-slate-400">{item.key}</span>
                      <span className="font-bold text-slate-200 text-right">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {details.parents.length > 0 && (
              <div className="text-[10px] font-mono-tabular text-slate-400 px-1">
                Родительский узел: <b className="text-purple-300">{details.parents.join(', ')}</b>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Eclipse Ditto Raw JSON */}
        {activeTab === 'ditto' && (
          <div className="space-y-2">
            <div className="relative">
              <pre className="p-2.5 rounded-lg bg-black/80 border border-slate-800 text-[10px] font-mono-tabular text-emerald-400 overflow-x-auto max-h-[36vh] leading-snug">
                {JSON.stringify(details.dittoJson, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Buttons Bar */}
      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-slate-800/80 shrink-0">
        <button
          type="button"
          onClick={() => onFocusCamera(details.position, details.cameraOffset)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono-tabular font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all shadow-sm"
          title="Сфокусировать 3D камеру на этом объекте"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Фокус камеры (3D)</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyJson}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono-tabular font-bold border transition-all ${
              copied
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
            title="Скопировать валидный JSON-пакет протокола Eclipse Ditto (W3C WoT)"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-purple-300" />}
            <span>{copied ? 'Скопировано!' : 'Ditto JSON'}</span>
          </button>

          {onOpenDittoCatalog && (
            <button
              type="button"
              onClick={onOpenDittoCatalog}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono-tabular font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all"
              title="Открыть каталог всех 24 цифровых двойников"
            >
              <span>24 Двойника →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
