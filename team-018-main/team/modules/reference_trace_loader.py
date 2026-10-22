"""
Smart-Kenish 4.0: Reference Trace Loader & Trace-Driven Physics Adapter.
Loads compact real-world industrial datasets recommended by OpenEgiz (/ru/data/).
Employs Replay + Physics pattern with graceful mathematical fallback.
Zero external dependencies (pure Python standard library).
"""

import os
import csv
import logging
import math

log = logging.getLogger("ReferenceTraceLoader")


class ReferenceTraceLoader:
    """
    Manages deterministic playback of official contest reference datasets:
    1. Flotation Plant: Quality Prediction in a Mining Process (CC0)
    2. Power Grid: Energy consumption of mining plant (Zenodo 20647907, CC BY 4.0)
    3. Seismic/Geomechanics: Seismic Bumps (UCI) & MWD Hard Rock (Zenodo 10358374, CC BY 4.0)
    4. Atmosphere: Mine Atmosphere Gas Sensor Array (Mendeley, CC BY 4.0)
    """

    def __init__(self, base_dir: str | None = None):
        self.traces = {
            "flotation": [],
            "energy": [],
            "seismic": [],
            "atmosphere": [],
        }
        self.loaded = False
        self._find_and_load(base_dir)

    def _find_and_load(self, base_dir: str | None):
        candidates = []
        if base_dir:
            candidates.append(base_dir)

        # Standard discovery locations
        module_dir = os.path.dirname(os.path.abspath(__file__))
        candidates.extend([
            os.path.join(module_dir, "..", "data", "reference_traces"),
            os.path.join(module_dir, "..", "..", "team", "data", "reference_traces"),
            os.path.join(os.getcwd(), "team", "data", "reference_traces"),
            os.path.join(os.getcwd(), "team-018-main", "team", "data", "reference_traces"),
        ])

        target_dir = None
        for c in candidates:
            if os.path.isdir(c) and os.path.exists(os.path.join(c, "flotation_plant_trace.csv")):
                target_dir = c
                break

        if not target_dir:
            log.warning("Reference trace directory not found; engaging pure mathematical fallback engine.")
            return

        # 1. Flotation
        self.traces["flotation"] = self._read_csv(
            os.path.join(target_dir, "flotation_plant_trace.csv"),
            ["feed_silica_pct", "feed_iron_pct", "starch_flow_m3h", "amina_flow_m3h", "pulp_flow_m3h", "pulp_ph", "flotation_air_flow_nm3h", "tailings_silica_pct"]
        )

        # 2. Energy
        self.traces["energy"] = self._read_csv(
            os.path.join(target_dir, "grid_energy_trace.csv"),
            ["substation_base_kw", "grid_freq_hz", "power_factor", "active_reactive_kvar", "tariff_peak_flag", "ambient_temp_c"]
        )

        # 3. Seismic
        self.traces["seismic"] = self._read_csv(
            os.path.join(target_dir, "seismic_geotech_trace.csv"),
            ["microseismic_energy_j", "geophone_pulse_rate_hz", "blast_ppv_mm_s", "acoustic_emission_db", "mwd_sed_mj_m3", "rock_hardness_f"]
        )

        # 4. Atmosphere
        self.traces["atmosphere"] = self._read_csv(
            os.path.join(target_dir, "mine_atmosphere_trace.csv"),
            ["pm10_ug_m3", "pm25_ug_m3", "co_ppm", "nox_ppm", "wind_speed_ms", "ambient_humidity_pct"]
        )

        total_rows = sum(len(v) for v in self.traces.values())
        if total_rows > 0:
            self.loaded = True
            log.info("Trace-Driven Engine initialized: loaded %d observations across 4 domains from %s", total_rows, target_dir)

    def _read_csv(self, filepath: str, float_cols: list[str]) -> list[dict]:
        if not os.path.exists(filepath):
            return []
        rows = []
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    parsed = {}
                    for col in float_cols:
                        parsed[col] = float(r.get(col, 0.0))
                    rows.append(parsed)
        except Exception as e:
            log.warning("Failed parsing %s: %s", filepath, e)
        return rows

    def get_flotation(self, step: int) -> dict:
        data = self.traces["flotation"]
        if data:
            return data[step % len(data)]
        # Mathematical fallback
        t = float(step)
        sio2 = 2.45 + 0.35 * math.sin(t * 0.02)
        fe = 58.5 - 1.2 * sio2
        return {
            "feed_silica_pct": round(sio2, 3),
            "feed_iron_pct": round(fe, 2),
            "starch_flow_m3h": 2450.0,
            "amina_flow_m3h": 480.0,
            "pulp_flow_m3h": 395.0,
            "pulp_ph": 9.85,
            "flotation_air_flow_nm3h": 290.0,
            "tailings_silica_pct": round(1.25 * sio2 - 0.2, 3),
        }

    def get_energy(self, step: int) -> dict:
        data = self.traces["energy"]
        if data:
            return data[step % len(data)]
        t = float(step)
        base_kw = 3450.0 + 380.0 * math.sin(t * 0.006)
        return {
            "substation_base_kw": round(base_kw, 1),
            "grid_freq_hz": round(50.00 + 0.02 * math.sin(t * 0.08), 3),
            "power_factor": 0.945,
            "active_reactive_kvar": round(base_kw * 0.35, 1),
            "tariff_peak_flag": 2 if (400 <= (step % 1200) <= 800) else 0,
            "ambient_temp_c": round(22.0 + 5.0 * math.sin(t * 0.004), 1),
        }

    def get_seismic(self, step: int) -> dict:
        data = self.traces["seismic"]
        if data:
            return data[step % len(data)]
        t = float(step)
        sed = 41.5 + 4.0 * math.sin(t * 0.018)
        hardness = round(max(9.2, min(13.8, (sed - 5.0) / 3.35)), 1)
        return {
            "microseismic_energy_j": 480.0,
            "geophone_pulse_rate_hz": 4.2,
            "blast_ppv_mm_s": 0.45,
            "acoustic_emission_db": 42.0,
            "mwd_sed_mj_m3": round(sed, 2),
            "rock_hardness_f": hardness,
        }

    def get_atmosphere(self, step: int) -> dict:
        data = self.traces["atmosphere"]
        if data:
            return data[step % len(data)]
        t = float(step)
        pm10 = 24.0 + 8.0 * math.sin(t * 0.01)
        return {
            "pm10_ug_m3": round(pm10, 1),
            "pm25_ug_m3": round(0.45 * pm10, 1),
            "co_ppm": 3.2,
            "nox_ppm": 0.85,
            "wind_speed_ms": 3.6,
            "ambient_humidity_pct": 44.0,
        }
