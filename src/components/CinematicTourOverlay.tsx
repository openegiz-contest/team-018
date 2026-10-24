import React, { useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, X, Compass, Activity, Globe } from 'lucide-react';
import type { TourStep, TourLanguage } from '../domain/presentationTour';

export interface CinematicTourOverlayProps {
  currentStep: TourStep;
  stepIndex: number;
  totalSteps: number;
  isPaused: boolean;
  onNext: () => void;
  onPrev: () => void;
  onTogglePause: () => void;
  onClose: () => void;
}

const CinematicTourOverlay: React.FC<CinematicTourOverlayProps> = ({
  currentStep,
  stepIndex,
  totalSteps,
  isPaused,
  onNext,
  onPrev,
  onTogglePause,
  onClose,
}) => {
  const [lang, setLang] = useState<TourLanguage>('ru');
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= totalSteps - 1;

  const content = currentStep.translations?.[lang] ?? {
    title: currentStep.title,
    subtitle: currentStep.subtitle,
    description: currentStep.description,
    operationalMetrics: currentStep.operationalMetrics,
    highlights: currentStep.highlights,
  };

  const stepLabels: Record<TourLanguage, string> = {
    ru: `Шаг ${stepIndex + 1} из ${totalSteps}`,
    kk: `${stepIndex + 1}-қадам (барлығы ${totalSteps})`,
    en: `Step ${stepIndex + 1} of ${totalSteps}`,
  };

  const prevLabels: Record<TourLanguage, string> = {
    ru: 'Назад',
    kk: 'Артқа',
    en: 'Back',
  };

  const nextLabels: Record<TourLanguage, string> = {
    ru: 'Далее',
    kk: 'Алға',
    en: 'Next',
  };

  const pauseLabels: Record<TourLanguage, string> = {
    ru: isPaused ? 'Продолжить' : 'Пауза',
    kk: isPaused ? 'Жалғастыру' : 'Кідірту',
    en: isPaused ? 'Resume' : 'Pause',
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-2xl w-[92vw] sm:w-full pointer-events-auto">
      <div className="bg-[#090d16]/95 backdrop-blur-xl border border-cyan-500/35 rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 whitespace-nowrap">
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              {stepLabels[lang]}
            </span>

            {/* Language Switcher Buttons: RU | KK | EN */}
            <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setLang('kk')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold transition-all ${
                  lang === 'kk'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Қазақ тіліне ауыстыру"
              >
                ҚАЗ
              </button>
              <button
                type="button"
                onClick={() => setLang('ru')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold transition-all ${
                  lang === 'ru'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Русский язык"
              >
                РУС
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold transition-all ${
                  lang === 'en'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="English"
              >
                ENG
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0 text-center">
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">
              {content.title}
            </h2>
            <p className="text-xs sm:text-sm text-cyan-300/80 truncate">
              {content.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть тур"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {content.description}
        </p>

        {content.operationalMetrics.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {content.operationalMetrics.map((metric, index) => (
              <div
                key={`${metric.label}-${index}`}
                className="flex flex-col rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5"
              >
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  {metric.label}
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-400">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {content.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {content.highlights.map((highlight, index) => (
              <span
                key={`${highlight}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300"
              >
                <Activity className="h-3 w-3" aria-hidden="true" />
                {highlight}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {prevLabels[lang]}
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-sm font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                {pauseLabels[lang]}
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" aria-hidden="true" />
                {pauseLabels[lang]}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
          >
            {nextLabels[lang]}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CinematicTourOverlay;

