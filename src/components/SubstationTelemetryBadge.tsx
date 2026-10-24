import React from 'react';
import type { SubstationTelemetryData } from '../domain/substationTelemetry';

interface SubstationTelemetryProps {
  telemetry?: SubstationTelemetryData;
}

export const SubstationTelemetryBadge: React.FC<SubstationTelemetryProps> = ({ telemetry }) => {
  const voltage = telemetry?.tractionVoltage1200V?.toFixed(0) ?? '1200';
  const power = telemetry?.totalActivePowerMW?.toFixed(1) ?? '4.8';
  const status = telemetry?.emergencyStatus ?? 'NORMAL';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.25rem 0.65rem',
      background: 'rgba(15, 23, 42, 0.85)',
      border: '1px solid #0284c7',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontFamily: 'monospace',
      color: '#38bdf8'
    }}>
      <span>⚡ Подстанция 110/1200В:</span>
      <span style={{ color: '#f8fafc', fontWeight: 600 }}>{voltage} В</span>
      <span style={{ color: '#34d399' }}>{power} МВт</span>
      <span style={{
        padding: '0.1rem 0.35rem',
        borderRadius: '0.25rem',
        background: '#064e3b',
        color: '#6ee7b7',
        fontSize: '0.7rem'
      }}>
        {status}
      </span>
    </div>
  );
};

export default SubstationTelemetryBadge;
