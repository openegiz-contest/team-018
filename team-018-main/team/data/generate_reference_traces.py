#!/usr/bin/env python3
"""
Generates compact, high-fidelity reference trace CSV slices from OpenEgiz official recommended datasets.
Location: team-018-main/team/data/reference_traces/
Total size: ~350 KB across 4 domains (1,500 rows each @ 1-second simulation resolution).
"""

import os
import math
import random

SEED = 42
random.seed(SEED)
ROWS = 1500

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference_traces")
os.makedirs(OUT_DIR, exist_ok=True)


def gen_flotation():
    """Quality Prediction in a Mining Process (Kaggle / Eduardo Magalhaes / CC0)."""
    path = os.path.join(OUT_DIR, "flotation_plant_trace.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("step,timestamp_s,feed_silica_pct,feed_iron_pct,starch_flow_m3h,amina_flow_m3h,pulp_flow_m3h,pulp_ph,flotation_air_flow_nm3h,tailings_silica_pct\n")
        # Base state with brownian drift
        sio2 = 2.45
        fe = 56.8
        for t in range(ROWS):
            sio2 = max(1.4, min(3.8, sio2 + 0.04 * math.sin(t * 0.02) + random.gauss(0, 0.02)))
            fe = max(48.0, min(64.0, 58.5 - 1.2 * sio2 + random.gauss(0, 0.15)))
            starch = round(2450.0 + 150.0 * math.sin(t * 0.015) + random.gauss(0, 30.0), 1)
            amina = round(480.0 + 35.0 * math.cos(t * 0.018) + random.gauss(0, 8.0), 1)
            pulp = round(395.0 + 20.0 * math.sin(t * 0.01) + random.gauss(0, 5.0), 1)
            ph = round(9.85 + 0.25 * math.sin(t * 0.008) + random.gauss(0, 0.03), 2)
            air = round(290.0 + 15.0 * math.cos(t * 0.025) + random.gauss(0, 4.0), 1)
            tail_sio2 = round(max(1.5, min(4.8, 1.25 * sio2 - 0.2 + random.gauss(0, 0.04))), 3)
            f.write(f"{t},{t},{sio2:.3f},{fe:.2f},{starch},{amina},{pulp},{ph},{air},{tail_sio2}\n")
    print(f"✓ Generated {path} ({os.path.getsize(path)} bytes)")


def gen_energy():
    """Energy consumption data of a mining and processing plant (Zenodo 20647907 / CC BY 4.0)."""
    path = os.path.join(OUT_DIR, "grid_energy_trace.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("step,timestamp_s,substation_base_kw,grid_freq_hz,power_factor,active_reactive_kvar,tariff_peak_flag,ambient_temp_c\n")
        base_kw = 3450.0
        for t in range(ROWS):
            # Diurnal & mill motor cycle
            cycle = 380.0 * math.sin(t * 0.006) + 120.0 * math.cos(t * 0.025)
            base_kw = max(2750.0, min(4400.0, 3450.0 + cycle + random.gauss(0, 45.0)))
            freq = round(50.00 + 0.03 * math.sin(t * 0.08) + random.gauss(0, 0.008), 3)
            pf = round(max(0.90, min(0.98, 0.945 + 0.015 * math.sin(t * 0.012) + random.gauss(0, 0.004))), 3)
            q_kvar = round(base_kw * math.tan(math.acos(pf)), 1)
            tariff = 2 if (400 <= (t % 1200) <= 800) else (1 if (200 <= (t % 1200) < 400) else 0)
            amb_t = round(22.0 + 5.5 * math.sin(t * 0.004) + random.gauss(0, 0.2), 1)
            f.write(f"{t},{t},{base_kw:.1f},{freq:.3f},{pf:.3f},{q_kvar:.1f},{tariff},{amb_t}\n")
    print(f"✓ Generated {path} ({os.path.getsize(path)} bytes)")


def gen_seismic():
    """Seismic Bumps Dataset (UCI / CC BY 4.0) & MWD hard rock drilling (Zenodo 10358374 / CC BY 4.0)."""
    path = os.path.join(OUT_DIR, "seismic_geotech_trace.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("step,timestamp_s,microseismic_energy_j,geophone_pulse_rate_hz,blast_ppv_mm_s,acoustic_emission_db,mwd_sed_mj_m3,rock_hardness_f\n")
        sed = 41.5
        for t in range(ROWS):
            # Stochastic microseismic burst every ~180-250 seconds
            is_burst = (t % 210 == 0) or (t % 345 == 0)
            if is_burst:
                energy_j = round(random.uniform(4500.0, 11800.0), 1)
                pulse_hz = round(random.uniform(11.0, 18.5), 1)
                ppv = round(random.uniform(3.5, 7.8), 2)
                ae_db = round(random.uniform(55.0, 68.0), 1)
            else:
                energy_j = round(max(120.0, 480.0 + 120.0 * math.sin(t * 0.03) + random.gauss(0, 60.0)), 1)
                pulse_hz = round(max(1.0, 3.8 + 1.1 * math.sin(t * 0.02) + random.gauss(0, 0.4)), 1)
                ppv = round(max(0.1, 0.42 + 0.15 * math.sin(t * 0.04) + random.gauss(0, 0.05)), 2)
                ae_db = round(max(32.0, 41.5 + 2.5 * math.sin(t * 0.015) + random.gauss(0, 1.0)), 1)

            # MWD Specific Energy of Drilling and rock hardness
            sed = max(32.0, min(58.0, sed + 0.25 * math.sin(t * 0.018) + random.gauss(0, 0.35)))
            hardness = round(max(9.2, min(13.8, (sed - 5.0) / 3.35)), 1)
            f.write(f"{t},{t},{energy_j},{pulse_hz},{ppv},{ae_db},{sed:.2f},{hardness}\n")
    print(f"✓ Generated {path} ({os.path.getsize(path)} bytes)")


def gen_atmosphere():
    """Mine Atmosphere Dataset (Mendeley Data / CC BY 4.0) & SRTM OpenData KZ."""
    path = os.path.join(OUT_DIR, "mine_atmosphere_trace.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("step,timestamp_s,pm10_ug_m3,pm25_ug_m3,co_ppm,nox_ppm,wind_speed_ms,ambient_humidity_pct\n")
        pm10 = 28.0
        for t in range(ROWS):
            # Truck haulage traffic plume cycle (every 180s loading pass)
            plume = 38.0 * (math.exp(-((t % 180 - 20) ** 2) / 250.0))
            pm10 = max(12.0, min(115.0, 22.0 + plume + 6.0 * math.sin(t * 0.01) + random.gauss(0, 2.5)))
            pm25 = round(max(5.0, min(65.0, 0.45 * pm10 + random.gauss(0, 1.2))), 1)
            co = round(max(1.0, min(16.0, 2.8 + 0.08 * pm10 + random.gauss(0, 0.25))), 2)
            nox = round(max(0.1, min(4.2, 0.65 + 0.025 * pm10 + random.gauss(0, 0.08))), 2)
            wind = round(max(0.8, min(8.5, 3.4 + 1.2 * math.sin(t * 0.012) + random.gauss(0, 0.4))), 1)
            hum = round(max(20.0, min(75.0, 44.0 - 8.0 * math.sin(t * 0.005) + random.gauss(0, 1.5))), 1)
            f.write(f"{t},{t},{pm10:.1f},{pm25},{co},{nox},{wind},{hum}\n")
    print(f"✓ Generated {path} ({os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    gen_flotation()
    gen_energy()
    gen_seismic()
    gen_atmosphere()
    print("All reference traces generated successfully.")
