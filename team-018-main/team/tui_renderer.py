"""
Smart-Kenish 4.0 Material Design 24-Bit TrueColor TUI & Visualization Engine (Team-018).
Implements modern Material Design surface hierarchy (deep obsidian, elevated cards, active cursor highlights),
filled pill badges, sub-pixel fractional meters, live Braille sparklines, and symbolic+numerical formula resolvers.
Strictly zero legacy ASCII/DOS box-drawing borders.
"""

import math
import os
import re
import sys
from collections import deque

# -----------------------------------------------------------------------------
# 1. 24-BIT TRUECOLOR ANSI PALETTE & SURFACE ELEVATION SYSTEM
# -----------------------------------------------------------------------------

def rgb_fg(r: int, g: int, b: int) -> str:
    return f"\033[38;2;{r};{g};{b}m"

def rgb_bg(r: int, g: int, b: int) -> str:
    return f"\033[48;2;{r};{g};{b}m"

RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
UNDERLINE = "\033[4m"

# Surface Elevation Palette
BG_CANVAS      = rgb_bg(11, 15, 23)        # #0B0F17 Deep obsidian base
BG_CARD        = rgb_bg(21, 28, 40)        # #151C28 Elevated material card surface
BG_CARD_ACTIVE = rgb_bg(30, 41, 59)        # #1E293B Highlighted / cursor-selected surface
BG_HEADER      = rgb_bg(15, 23, 42)        # #0F172A Top telemetry ribbon
BG_DRAWER      = rgb_bg(17, 24, 39)        # #111827 Deep Inspector Drawer

# Text & Accent Palette
FG_WHITE       = rgb_fg(248, 250, 252)     # #F8FAFC Crisp white primary text
FG_SLATE       = rgb_fg(148, 163, 184)     # #94A3B8 Muted slate labels
FG_MUTED       = rgb_fg(100, 116, 139)     # #64748B Secondary slate
FG_HAIRLINE    = rgb_fg(38, 47, 63)        # #262F3F Ultra-subtle single hairline
FG_CYAN        = rgb_fg(56, 189, 248)      # #38BDF8 Cyan accent
FG_EMERALD     = rgb_fg(16, 185, 129)      # #10B981 Nominal green
FG_AMBER       = rgb_fg(245, 158, 11)      # #F59E0B Warning amber
FG_CRIMSON     = rgb_fg(239, 68, 68)       # #EF4444 Critical crimson
FG_VIOLET      = rgb_fg(168, 85, 247)      # #A855F7 Regeneration violet
FG_GOLD        = rgb_fg(234, 179, 8)       # #EAB308 Diesel amber

ANSI_STRIP_RE = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")

def strip_ansi(text: str) -> str:
    return ANSI_STRIP_RE.sub("", text)

def visible_len(text: str) -> int:
    return len(strip_ansi(text))

# -----------------------------------------------------------------------------
# 2. FILLED PILL BADGES (SOLID CAPSULES WITH 1-SPACE HORIZONTAL PADDING)
# -----------------------------------------------------------------------------

def pill_nominal(text: str = "● NOMINAL") -> str:
    return f"\033[48;2;16;185;129m\033[38;2;6;20;15m\033[1m {text} {RESET}"

def pill_warning(text: str = "▲ GEN-1 DEGRADED") -> str:
    return f"\033[48;2;245;158;11m\033[38;2;20;12;0m\033[1m {text} {RESET}"

def pill_critical(text: str = "■ GEN-2 FAULT") -> str:
    return f"\033[48;2;239;68;68m\033[38;2;255;255;255m\033[1m {text} {RESET}"

def pill_trolley(text: str = "⚡ 1200V DC") -> str:
    return f"\033[48;2;56;189;248m\033[38;2;6;18;30m\033[1m {text} {RESET}"

def pill_regen(text: str = "↺ REGEN -210kW") -> str:
    return f"\033[48;2;168;85;247m\033[38;2;255;255;255m\033[1m {text} {RESET}"

def pill_diesel(text: str = "⛽ DIESEL") -> str:
    return f"\033[48;2;234;179;8m\033[38;2;20;12;0m\033[1m {text} {RESET}"

def pill_queued(text: str = "⏳ QUEUED") -> str:
    return f"\033[48;2;71;85;105m\033[38;2;248;250;252m\033[1m {text} {RESET}"

def pill_info(text: str) -> str:
    return f"\033[48;2;30;41;59m\033[38;2;148;163;184m\033[1m {text} {RESET}"

# -----------------------------------------------------------------------------
# 3. HIGH-PRECISION SUB-PIXEL METERS & SETPOINT SLIDERS
# -----------------------------------------------------------------------------

SUBPIXEL_CHARS = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"]

def subpixel_meter(val: float, max_val: float, width: int = 14, color_mode: str = "auto") -> str:
    """Render fractional 8-step sub-pixel Unicode bar with smooth color transitions."""
    if max_val <= 0:
        pct = 0.0
    else:
        pct = max(0.0, min(1.0, float(val) / float(max_val)))

    total_eighths = int(round(pct * width * 8))
    full_blocks = total_eighths // 8
    rem_eighths = total_eighths % 8

    if color_mode == "auto":
        if pct < 0.65:
            fg = FG_EMERALD
        elif pct < 0.85:
            fg = FG_AMBER
        else:
            fg = FG_CRIMSON
    elif color_mode == "cyan":
        fg = FG_CYAN
    elif color_mode == "emerald":
        fg = FG_EMERALD
    elif color_mode == "amber":
        fg = FG_AMBER
    elif color_mode == "violet":
        fg = FG_VIOLET
    else:
        fg = FG_WHITE

    blocks = "█" * full_blocks
    partial = SUBPIXEL_CHARS[rem_eighths] if rem_eighths > 0 and full_blocks < width else ""
    bar_str = blocks + partial
    empty_count = width - len(bar_str)
    empty_str = f"{FG_HAIRLINE}{'░' * empty_count}{RESET}" if empty_count > 0 else ""

    return f"{fg}{bar_str}{RESET}{empty_str}"

def setpoint_slider(current_val: float, target_val: float = 0.850, tolerance: float = 0.030, span: float = 0.060, width: int = 15) -> str:
    """Render setpoint error slider: ──────┼───●────── showing target center and live marker."""
    center = width // 2
    dev = float(current_val) - float(target_val)
    offset = int(round((dev / span) * center)) if span > 0 else 0
    marker_pos = max(0, min(width - 1, center + offset))

    chars = list("─" * width)
    chars[center] = "┼"

    if abs(dev) <= tolerance:
        m_color = FG_EMERALD
    elif abs(dev) <= tolerance * 2:
        m_color = FG_AMBER
    else:
        m_color = FG_CRIMSON

    chars[marker_pos] = f"{m_color}●{FG_HAIRLINE}"
    return f"{FG_HAIRLINE}[{''.join(chars)}]{RESET}"

# -----------------------------------------------------------------------------
# 4. LIVE BRAILLE SPARKLINES (60-TICK ROLLING HISTORY)
# -----------------------------------------------------------------------------

BRAILLE_LEVELS = [" ", "⡀", "⡄", "⡆", "⡇", "⣇", "⣧", "⣷", "⣿"]

def braille_sparkline(values, width: int = 20, min_v: float = None, max_v: float = None, color: str = FG_CYAN) -> str:
    """Render 1-row Unicode Braille sparklines from rolling float history."""
    if not values:
        return f"{FG_HAIRLINE}{' ' * width}{RESET}"

    data_pts = list(values)[-width:]
    low = min(data_pts) if min_v is None else min_v
    high = max(data_pts) if max_v is None else max_v
    rng = (high - low) if (high - low) > 1e-6 else 1.0

    chars = []
    for v in data_pts:
        frac = max(0.0, min(1.0, (float(v) - low) / rng))
        idx = int(round(frac * (len(BRAILLE_LEVELS) - 1)))
        chars.append(BRAILLE_LEVELS[idx])

    if len(chars) < width:
        chars = [" "] * (width - len(chars)) + chars

    return f"{color}{''.join(chars)}{RESET}"

# -----------------------------------------------------------------------------
# 5. MATERIAL DESIGN SURFACE CONTAINER (CARD ENGINE)
# -----------------------------------------------------------------------------

def material_card(title: str, lines: list, is_active: bool = False, width: int = 98, badge_pill: str = "") -> str:
    """
    Renders an elevated Material Design surface card.
    Strictly NO legacy ASCII/DOS box-drawing borders.
    """
    bg = BG_CARD_ACTIVE if is_active else BG_CARD
    accent = f"{FG_CYAN}▍{RESET}" if is_active else f"{FG_HAIRLINE}│{RESET}"

    badge_str = f" {badge_pill}" if badge_pill else ""
    t_vis = visible_len(title)
    b_vis = visible_len(badge_str)
    avail_space = max(2, width - t_vis - b_vis - 4)

    header = f"{bg} {accent} {BOLD}{FG_WHITE}{title}{RESET}{bg}{' ' * avail_space}{badge_str} {RESET}"
    divider = f"{bg} {FG_HAIRLINE}{'─' * (width - 4)}{RESET}{bg} {RESET}"

    body_lines = [header, divider]
    for line in lines:
        v_len = visible_len(line)
        pad = max(0, width - v_len - 4)
        sanitized_line = line.replace(RESET, f"{RESET}{bg}")
        body_lines.append(f"{bg}   {sanitized_line}{RESET}{bg}{' ' * pad} {RESET}")

    bottom_pad = f"{bg}{' ' * width}{RESET}"
    body_lines.append(bottom_pad)

    return "\n".join(body_lines)

# -----------------------------------------------------------------------------
# 6. GLOBAL TELEMETRY HISTORY REGISTRY
# -----------------------------------------------------------------------------

class TelemetryHistory:
    """Maintains 60-tick rolling telemetry history for real-time Braille sparklines."""
    def __init__(self, maxlen: int = 60):
        self.grade = deque(maxlen=maxlen)
        self.tonnes = deque(maxlen=maxlen)
        self.sag_power = deque(maxlen=maxlen)
        self.fos = deque(maxlen=maxlen)
        self.sump_level = deque(maxlen=maxlen)
        self.truck_speed = {"truck-01": deque(maxlen=maxlen)}
        self.crusher_tph = deque(maxlen=maxlen)
        self.conveyor_tph = deque(maxlen=maxlen)
        self.stockpile_t = deque(maxlen=maxlen)

    def record(self, data: dict):
        if not data:
            return
        m01 = data.get("mine-01", {})
        g = m01.get("avg_grade", {}).get("value", 0.850)
        self.grade.append(float(g))

        t = m01.get("tonnes_mined", {}).get("value", 0.0)
        self.tonnes.append(float(t))

        sag = data.get("sag-mill-01", {})
        sp = sag.get("power_kw", {}).get("value", 5875.0)
        self.sag_power.append(float(sp))

        sr = data.get("slope-radar-01", {})
        f = sr.get("factor_of_safety_fos", {}).get("value", 1.36)
        self.fos.append(float(f))

        ps = data.get("pump-station-01", {})
        lvl = ps.get("sump_water_level_m", {}).get("value", 1.15)
        self.sump_level.append(float(lvl))

        cr = data.get("crusher-01", {})
        ct = cr.get("throughput_tph", {}).get("value", 2400.0)
        self.crusher_tph.append(float(ct))

        cv = data.get("conveyor-main-01", {})
        cvt = cv.get("mass_flow_tph", {}).get("value", 2400.0)
        self.conveyor_tph.append(float(cvt))

        st = data.get("stockpile-coarse-01", {})
        stt = st.get("live_tonnage_t", {}).get("value", 28500.0)
        self.stockpile_t.append(float(stt))

        tr = data.get("truck-01", {})
        s = tr.get("speed", {}).get("value", 0.0)
        self.truck_speed["truck-01"].append(float(s))

GLOBAL_HISTORY = TelemetryHistory(maxlen=60)

# -----------------------------------------------------------------------------
# 7. LIVE SYMBOLIC + NUMERICAL FORMULA RESOLVER
# -----------------------------------------------------------------------------

def resolve_unit_physics(unit_id: str, data: dict) -> dict:
    """
    Substitutes live runtime variables into the governing physical and economic formulas
    for the selected digital twin or controller.
    """
    clean_id = unit_id.split(":")[-1] if ":" in unit_id else unit_id

    # 1. Haul Trucks (truck-01 .. truck-08)
    if clean_id.startswith("truck-0") or clean_id.startswith("truck-"):
        tr = data.get(clean_id, {})
        v_kmh = tr.get("speed", {}).get("value", 0.0)
        v_ms = v_kmh / 3.6
        payload = tr.get("payload", {}).get("value", 0.0)
        mu_eff = tr.get("traction_mu_eff", {}).get("value", 0.650)
        theta_rad = 0.085
        crr = 0.020
        g = 9.81
        tr_react = 1.20
        gross_t = 107.0 + payload
        gross_kg = gross_t * 1000.0

        cos_t = math.cos(theta_rad)
        sin_t = math.sin(theta_rad)
        denom = max(0.05, mu_eff * cos_t - sin_t - crr)
        d_stop = round(v_ms * tr_react + (v_ms ** 2) / (2.0 * g * denom), 2)

        # Force Vectors
        f_grade_kn = round(gross_kg * g * sin_t / 1000.0, 1)
        f_rr_kn = round(gross_kg * g * crr * cos_t / 1000.0, 1)
        f_tr_kn = round(f_grade_kn + f_rr_kn + 8.5, 1) if v_kmh > 0 else 0.0
        accel = 0.045 if v_kmh > 0 else 0.0

        return {
            "title": f"BelAZ-75131 Haul Truck: {clean_id.upper()}",
            "type": "Traction & ISO 3450 Braking ODE",
            "equation": "d_stop = v·t_r + v² / [2·g·(μ_eff(w)·cosθ - sinθ - C_rr)]",
            "live_calc": f"{v_ms:.2f}·{tr_react:.2f} + ({v_ms:.2f})² / [2·{g:.2f}·({mu_eff:.3f}·{cos_t:.3f} - {sin_t:.3f} - {crr:.3f})] = {d_stop:.2f} m",
            "forces": f"F_tr = +{f_tr_kn:.1f} kN  │  F_grade = -{f_grade_kn:.1f} kN  │  F_rr = -{f_rr_kn:.1f} kN  │  a = {accel:+.3f} m/s²",
            "state_badge": pill_trolley("⚡ 1200V DC") if tr.get("trolley_mode", {}).get("value") == 1 else (pill_regen() if "regen" in tr.get("propulsion_mode", {}).get("value", "") else pill_diesel()),
            "metrics": [
                ("Route Position", f"{tr.get('route_position', {}).get('value', 0.0):.2f} km"),
                ("Speed / Grade", f"{v_kmh:.1f} km/h (Ramp +8.5%)"),
                ("Payload / Gross", f"{payload:.1f} t / {gross_t:.1f} t"),
                ("Tire TKPH / Temp", f"{tr.get('tkph', {}).get('value', 140.0):.0f} TKPH │ {tr.get('tire_temp_c', {}).get('value', 55.0):.0f}°C"),
                ("Traction μ_eff", f"{mu_eff:.3f} (Dry/Damped Baseline)"),
                ("Wet Derate Active", "ACTIVE (Speed Capped)" if d_stop > 45.0 else "NOMINAL (Full Speed)"),
            ]
        }

    # 2. Grade Blending Controller / Mine Entity
    elif clean_id in ("GradeBlendingController", "grade-controller", "mine-01"):
        m01 = data.get("mine-01", {})
        cr = data.get("crusher-01", {})
        feed_grade = cr.get("feed_grade", {}).get("value", 0.850)
        target = 0.850
        k_gain = m01.get("kalman_gain", {}).get("value", 0.312)
        innov = m01.get("kalman_innovation_error", {}).get("value", 0.0)
        smart_err = m01.get("smart_grade_error", {}).get("value", feed_grade - target)
        err = smart_err
        prior = feed_grade - innov
        post = prior + k_gain * innov

        kp = m01.get("kp_live", {}).get("value", 1.85)
        ki = m01.get("ki_live", {}).get("value", 0.008)
        kd = m01.get("kd_live", {}).get("value", 4.20)
        split_north = m01.get("north_dispatch_ratio", {}).get("value", 44.4)
        split_south = 100.0 - split_north

        uop_usd = m01.get("uop_depletion_usd_t", {}).get("value", 0.117)
        npv = m01.get("npv_usd", {}).get("value", 18422727.0)
        irr = m01.get("irr_pct", {}).get("value", 68.0)

        return {
            "title": "Grade Blending Controller & IFRS 6 Valuation",
            "type": "Discrete EKF Sensor Filter & Adaptive Lyapunov PID Dispatch",
            "equation": "Kalman: x̂_k = x̂_k-1 + K_k·(z_k - x̂_k-1)  │  PID: u(t) = Kp·e + Ki·∫e·dt + Kd·de/dt",
            "live_calc": f"{prior:.3f}% + {k_gain:.3f}·({feed_grade:.3f}% - {prior:.3f}%) = {post:.3f}% Cu  │  [Kp={kp:.2f}, Ki={ki:.4f}, Kd={kd:.2f}]",
            "forces": f"Optimal Shovel Dispatch: {split_north:.1f}% North Bench (EX-01) │ {split_south:.1f}% South Bench (EX-02)",
            "state_badge": pill_nominal("● IN TOLERANCE (±0.03% Cu)") if abs(err) <= 0.03 else pill_warning("▲ CORRECTING"),
            "metrics": [
                ("Blended Feed Grade", f"{feed_grade:.3f}% Cu (Target 0.850%)"),
                ("Kalman Filter Estimate", f"{post:.3f}% Cu (Innovation {err:+.3f}%)"),
                ("IFRS 6 / IAS 16 UoP", f"${uop_usd:.3f} / t (Tax Shield $0.0233/t)"),
                ("NPV (10y @ 10%)", f"+${npv/1e6:.2f} M"),
                ("IRR / Cash-on-Cash", f"{irr:.1f} %"),
                ("Mining OPEX", f"${m01.get('opex_per_tonne', {}).get('value', 0.98):.2f} / t"),
            ]
        }

    # 3. Geotechnical Slope Radar (slope-radar-01)
    elif clean_id in ("slope-radar-01", "radar"):
        sr = data.get("slope-radar-01", {})
        fos = sr.get("factor_of_safety_fos", {}).get("value", 1.36)
        u_kpa = sr.get("pore_pressure_kpa", {}).get("value", 56.3)
        v_def = sr.get("deformation_velocity_mm_h", {}).get("value", 0.12)
        inv_v = sr.get("inverse_velocity_h_mm", {}).get("value", 8.33)
        c_eff = 635.0
        norm_stress = 711.9
        tan_phi = 0.6745
        driving_shear = 790.64

        calc_str = f"[{c_eff:.1f} + ({norm_stress:.1f} - {u_kpa:.1f})·{tan_phi:.4f}] / {driving_shear:.2f} = {fos:.2f} FoS"

        return {
            "title": "GroundProbe SSR-XT Slope Stability Radar",
            "type": "Mohr-Coulomb Limit Equilibrium & Fukuzono Inverse Velocity",
            "equation": "FoS = [c' + (γ·z·cos²β - u(t))·tanφ'] / [γ·z·sinβ·cosβ]  │  1/v_def = 1 / max(1e-4, v_def)",
            "live_calc": f"{calc_str}  │  1/v_def = 1 / {max(1e-4, v_def):.2f} = {inv_v:.2f} h/mm",
            "forces": f"Safety Zone: Deep Pit South Wall Sector 4 (-60m)  │  Interlock Status: {'DISENGAGED (SAFE)' if fos >= 1.15 else 'EVACUATION ACTIVE'}",
            "state_badge": pill_nominal("● STABLE FoS > 1.35") if fos >= 1.35 else (pill_warning("▲ CAUTION") if fos >= 1.15 else pill_critical("■ EVACUATION")),
            "metrics": [
                ("Factor of Safety", f"{fos:.2f} FoS (Mohr-Coulomb Criterion)"),
                ("Pore Water Pressure u", f"{u_kpa:.1f} kPa (Hydrogeological Head)"),
                ("Deformation Velocity", f"{v_def:.2f} mm/h"),
                ("Inverse Velocity", f"{inv_v:.2f} h/mm (Fukuzono Countdown)"),
                ("Radar Interferometry", "GroundProbe SSR-XT Sub-mm Phase"),
                ("Interlock Alarm", sr.get("slope_alarm_status", {}).get("value", "NORMAL")),
            ]
        }

    # 4. Concentrator SAG Mill (sag-mill-01)
    elif clean_id in ("sag-mill-01", "sag-mill"):
        sag = data.get("sag-mill-01", {})
        power = sag.get("power_kw", {}).get("value", 6072.0)
        rec = sag.get("flotation_recovery_cu_pct", {}).get("value", 90.50)
        feed_tph = sag.get("feed_rate_tph", {}).get("value", 1500.0)
        spec = sag.get("specific_energy_kwh_t", {}).get("value", 4.05)
        wi = 15.4
        p80, f80 = 1200.0, 150000.0

        calc_str = f"10·{feed_tph:.0f}·{wi:.1f}·(1/√{p80:.0f} - 1/√{f80:.0f}) = {power:.0f} kW"

        return {
            "title": "Outotec МПСИ-90 SAG Mill & Flotation Circuit",
            "type": "Bond Third Theory of Comminution & Flotation Kinetic Model",
            "equation": "P = 10·Q_feed·Wi·(1/√P80 - 1/√F80)  │  E_spec = P / Q_feed",
            "live_calc": f"{calc_str}  │  E_spec = {power:.0f} / {feed_tph:.0f} = {spec:.2f} kWh/t",
            "forces": f"Mill Speed: 74.5% Critical │ Ball Charge: 14.5% vol │ Slurry Solids: 72.1%",
            "state_badge": pill_nominal("● COMMINUTION NOMINAL") if power > 0 else pill_warning("▲ IDLE"),
            "metrics": [
                ("Motor Power", f"{power:,.0f} kW (Bond Third Theory)"),
                ("Ore Throughput", f"{feed_tph:,.0f} t/h (Feed from Coarse Stockpile)"),
                ("Specific Energy", f"{spec:.2f} kWh/t"),
                ("Flotation Cu Recovery", f"{rec:.2f} % Cu"),
                ("Discharge Size P80", "1,200 μm (To Ball Mill Secondary)"),
                ("Feed Top Size F80", "150,000 μm (From KKD-1500 Crusher)"),
            ]
        }

    # 5. Primary Gyratory Crusher (crusher-01 / crusher-standby-02)
    elif clean_id in ("crusher-01", "crusher-standby-02", "crusher"):
        cr = data.get("crusher-01", {})
        cr2 = data.get("crusher-standby-02", {})
        tph = cr.get("throughput_tph", {}).get("value", 2400.0)
        c_state = cr.get("state", {}).get("value", "crushing")
        vib = cr.get("vibration_rms", {}).get("value", 1.8)
        feed_g = cr.get("feed_grade", {}).get("value", 0.850)

        return {
            "title": "KKD-1500/180 Primary Gyratory Crusher & Standby Unit",
            "type": "Hydro-pneumatic Relief & Tramp Metal Automatic Pass",
            "equation": "Q_out = Q_nom·(1 - S_jam) + Q_standby·S_ats  │  CSS = 180 mm",
            "live_calc": f"2400 t/h·(1 - 0) + 0 = {tph:.0f} t/h  │  Vibration: {vib:.1f} mm/s (Nominal < 4.5)",
            "forces": f"Main Shaft Hydraulic Pressure: 14.2 MPa │ Standby Metso LT140: {cr2.get('state', {}).get('value', 'STANDBY_READY')}",
            "state_badge": pill_nominal("● PRIMARY ACTIVE") if c_state == "crushing" else pill_critical("■ RELIEF OPEN"),
            "metrics": [
                ("Primary Throughput", f"{tph:,.0f} t/h"),
                ("Feed Grade", f"{feed_g:.3f}% Cu"),
                ("Standby LT140 Mobile", f"{cr2.get('throughput_tph', {}).get('value', 0):.0f} t/h (Ready 550 t/h)"),
                ("Bearing Temperature", f"{cr.get('bearing_temp_c', {}).get('value', 58.0):.1f}°C"),
                ("Cavity Vibration RMS", f"{vib:.2f} mm/s"),
                ("Cumulative Crushed", f"{cr.get('tonnes_total', {}).get('value', 0.0):,.0f} t"),
            ]
        }

    # 6. Sump Dewatering & ATS Pontoon (pump-station-01)
    elif clean_id in ("pump-station-01", "dewatering", "pump"):
        ps = data.get("pump-station-01", {})
        lvl = ps.get("sump_water_level_m", {}).get("value", 1.15)
        q_in = ps.get("water_influx_m3h", {}).get("value", 45.0)
        q_out = ps.get("pump_flow_m3h", {}).get("value", 48.0)
        aux_st = ps.get("aux_pump_status", {}).get("value", "STANDBY")

        net_flow = q_in - q_out
        calc_str = f"dV/dt = {q_in:.1f} - {q_out:.1f} = {net_flow:+.1f} m³/h"

        return {
            "title": "Horizon -60m Sump Station & Pontoon Slurry ATS",
            "type": "Deep Pit Hydrogeological Influx & Dewatering Mass Balance ODE",
            "equation": "dV/dt = Q_in - (Q_wp01 + Q_wp02)  │  dh/dt = (dV/dt) / A_sump",
            "live_calc": f"{calc_str}  │  dh/dt = ({net_flow:+.1f}) / 4500 m² = {(net_flow/4500.0):+.4f} m/h",
            "forces": f"Duty Pump WP-01: VFD 100% (240 m³/h) │ Standby Pontoon WP-02: {aux_st} (320 m³/h)",
            "state_badge": pill_nominal("● LEVEL SAFE < 2.0m") if lvl < 2.0 else pill_critical("■ HIGH WATER"),
            "metrics": [
                ("Sump Water Level", f"{lvl:.2f} m (Alarm Threshold 2.50 m)"),
                ("Aquifer Influx Q_in", f"{q_in:.1f} m³/h"),
                ("Total Discharge Q_out", f"{q_out:.1f} m³/h"),
                ("Pontoon Pump WP-02", f"{aux_st}"),
                ("Pump Power Draw", f"{ps.get('pump_power_kw', {}).get('value', 45.0):.0f} kW"),
                ("Sump Surface Area", "4,500 m² (Bottom Horizon Basin)"),
            ]
        }

    # 7. Trolley Assist & BESS (trolley-line-01 / substation-01)
    elif clean_id in ("trolley-line-01", "substation-01", "trolley", "bess"):
        tl = data.get("trolley-line-01", {})
        sub = data.get("substation-01", {})
        volt = tl.get("line_voltage_v", {}).get("value", 1200.0)
        kw = tl.get("power_delivered_kw", {}).get("value", 3040.0)
        amps = tl.get("total_current_a", {}).get("value", 2533.0)
        trucks_conn = int(tl.get("connected_trucks", {}).get("value", 2))
        soc = sub.get("bess_soc_pct", {}).get("value", 88.1)
        bess_kw = sub.get("bess_power_kw", {}).get("value", 1330.0)

        calc_str = f"I = P / V = ({kw:.0f} kW · 1000) / {volt:.0f} V = {amps:.0f} A"

        return {
            "title": "1200V DC Trolley Assist & BESS Substation-01",
            "type": "Catenary Electrification & Fast Battery Peak-Shaving",
            "equation": "P_catenary = Σ P_truck_i - P_regen  │  I_line = P_net / V_line",
            "live_calc": f"{calc_str}  │  BESS SOC: {soc:.1f}% ({bess_kw:+.0f} kW Charge)",
            "forces": f"Substation Capacity: 6.0 MVA │ Catenary Chainage: 0.60 km to 2.40 km (+8.5% Ramp)",
            "state_badge": pill_trolley("⚡ 1200V DC ACTIVE"),
            "metrics": [
                ("Line Voltage", f"{volt:.0f} V DC"),
                ("Power Delivered", f"{kw:,.0f} kW"),
                ("Total Line Current", f"{amps:,.0f} A"),
                ("Connected Trucks", f"{trucks_conn} BelAZ-75131 Climbers"),
                ("BESS Storage SOC", f"{soc:.1f}% (1,500 kWh LFP Buffer)"),
                ("Downhill Regen Harvest", "120 kW (Recovered from Empty Descents)"),
            ]
        }

    # 8. TKPH Thermal Protector
    elif clean_id in ("TkphThermalProtector", "tkph-controller", "tkph"):
        return {
            "title": "TKPH Continuous Thermal Protection Controller",
            "type": "Tire Heat Dissipation ODE & Real-Time Speed Derating",
            "equation": "d(T_tire)/dt = (TKPH_live - TKPH_rated) / τ_thermal  │  v_derate = v_max · [1 - α·max(0, T_tire - T_warn)]",
            "live_calc": "d(T)/dt = (175.5 - 195.0) / 1200.0 = -0.016 °C/s  │  v_limit = 28.0 km/h (Nominal)",
            "forces": "Maximum fleet tire temperature: 68.2°C (truck-04)  │  Tire degradation: 0.00% (Protected)",
            "state_badge": pill_nominal("● TKPH SAFE < 195"),
            "metrics": [
                ("Rated TKPH Limit", "195.0 TKPH (Bridgestone 33.00R51 VRDP)"),
                ("Current Fleet Max", "175.5 TKPH (truck-04, 8.5% Ramp Climb)"),
                ("Thermal Time Constant", "1,200 s (20 min convective cooling)"),
                ("Critical Temp Threshold", "85.0°C (Carcass separation risk)"),
                ("Protective Speed Derate", "DISENGAGED (Full 28.0 km/h allowed)"),
                ("Tire Wear Factor", "1.00x (Standard ambient wear)"),
            ]
        }

    # 9. Trolley Energy Manager Module
    elif clean_id in ("TrolleyEnergyManager", "trolley-manager"):
        return {
            "title": "1200V DC Trolley Catenary & Substation Energy Manager",
            "type": "Power Flow Dispatch, Substation Peak-Shaving & BESS Arbitrage",
            "equation": "P_sub = max(0, Σ P_truck - P_bess_discharge - P_regen)  │  η_catenary = 0.94",
            "live_calc": "P_sub = max(0, 3040 - 1330 - 0) = 1710 kW  │  Grid Demand Shaved: -1330 kW",
            "forces": "Substation 6.0 MVA transformer  │  1.5 MWh BESS buffer  │  1.8 km overhead line",
            "state_badge": pill_trolley("⚡ 1200V PEAK-SHAVED"),
            "metrics": [
                ("Catenary Voltage", "1200 V DC (Nominal 1100-1250V range)"),
                ("Peak Catenary Load", "3,040 kW (2x BelAZ-75131 climbing)"),
                ("BESS Discharge Assist", "1,330 kW (Inverter 4C response)"),
                ("Net Grid Draw", "1,710 kW (Demand charge capped)"),
                ("BESS State of Charge", "88.1% (LFP chemistry)"),
                ("Monthly Demand Savings", "+$42,800 / month (Peak shaving)"),
            ]
        }

    # 10. Crusher Protection Unit Module
    elif clean_id in ("CrusherProtectionUnit", "crusher-protection"):
        return {
            "title": "Primary Gyratory Protection & Automatic Standby Transfer",
            "type": "Tramp Metal Acoustic Sensing & Hydraulic Relief Sequencing",
            "equation": "if F_hyd > F_trip or Vib > 4.5 mm/s => Trigger Relief Valve + Route to Standby LT140",
            "live_calc": "F_hyd = 14.2 MPa (< 18.0)  │  Vib = 1.8 mm/s (< 4.5) => NOMINAL CLOSED",
            "forces": "Tramp metal magnetic detector online  │  Standby Metso LT140 warm auto-start: 12.0s",
            "state_badge": pill_nominal("● RELIEF VALVE CLOSED"),
            "metrics": [
                ("Main Shaft Pressure", "14.2 MPa (Trip threshold 18.0 MPa)"),
                ("Spider Bearing Vib", "1.80 mm/s RMS (Alarm 4.50 mm/s)"),
                ("Tramp Metal Detector", "NOMINAL (Inductive coil pulse: none)"),
                ("Standby LT140 Status", "STANDBY_READY (Auto-start warm 12s)"),
                ("Hydraulic Oil Temp", "48.5°C (Cooling loop nominal)"),
                ("CSS Gap Calibrated", "180 mm (Hydraulic positioner locked)"),
            ]
        }

    # 11. Dewatering Controller Module
    elif clean_id in ("DewateringController", "dewatering-controller"):
        return {
            "title": "Deep Pit Horizon -60m Automatic Dewatering Regulator",
            "type": "Dynamic Sump Mass Balance ODE & Proportional VFD Inverter",
            "equation": "dh/dt = (Q_in - Q_out) / A_sump  │  f_vfd = f_min + (f_max - f_min)·(h - h_min)/(h_max - h_min)",
            "live_calc": "(45.0 - 48.0)/4500 = -0.0007 m/h  │  VFD Duty = 47.8 Hz (WP-01)",
            "forces": "Duty Pump WP-01 VFD Centrifugal  │  Pontoon WP-02 ATS Automatic Interlock",
            "state_badge": pill_nominal("● SUMP EQUILIBRIUM"),
            "metrics": [
                ("Sump Water Level", "1.15 m (Basin capacity 4,500 m²)"),
                ("Inflow Rate Q_in", "45.0 m³/h (Hydrogeological aquifer head)"),
                ("Discharge Rate Q_out", "48.0 m³/h (Duty WP-01 centrifugal)"),
                ("VFD Inverter Frequency", "47.8 Hz (Modulated for equilibrium)"),
                ("Emergency Pontoon ATS", "ARMED (Triggers at h >= 2.00 m)"),
                ("Evacuation Interlock", "DISENGAGED (Safe threshold < 2.50 m)"),
            ]
        }

    # 12. Sensor Degradation Simulator Module
    elif clean_id in ("SensorDegradationSimulator", "sensor-simulator"):
        return {
            "title": "Sensor Degradation & Telemetry Reliability Simulator",
            "type": "Thermal Sensor Drift, White Gaussian Noise & Packet Dropout",
            "equation": "z_k = x_k + N(0, σ_sensor) + δ_drift·(t - t_0)  │  CRC_check(z_k) == valid",
            "live_calc": "Noise σ = 0.002% Cu  │  Drift δ = +0.0001%/h  │  Packet Drop = 0.1%",
            "forces": "Telemetry Health: 99.9% valid packets across 24 Ditto twin topics",
            "state_badge": pill_nominal("● TELEMETRY RELIABLE"),
            "metrics": [
                ("Packet Loss Rate", "0.10 % (Industrial 802.11ah HaLow)"),
                ("Mean SNR", "31.4 dB (Sub-GHz base station)"),
                ("Grade XRF Noise σ", "0.002 % Cu (Calibrated online)"),
                ("Thermal Drift δ", "+0.0001 %/h (Temp compensated)"),
                ("ABAC Security Policy", "ENFORCED (Ed25519 Token Signatures)"),
                ("Ditto Twin Sync Latency","14.2 ms (Local Edge Broker)"),
            ]
        }

    # 13. Epiroc Pit Viper Drill Rig
    elif clean_id in ("drill-rig-01", "drill"):
        dr = data.get("drill-rig-01", {})
        rop = dr.get("rop_m_per_h", {}).get("value", 30.0)
        f_prot = dr.get("protodyakonov_hardness_f", {}).get("value", 11.8)
        wi = dr.get("bond_work_index_kwh_t", {}).get("value", 15.4)
        sed = dr.get("sed_mj_m3", {}).get("value", 42.1)
        return {
            "title": "Epiroc Pit Viper 271 Autonomous Blast Hole Drill Rig",
            "type": "Measurement-While-Drilling (MWD) & Geomechanical Inversion",
            "equation": "ROP = k_mwd · WOB^α · RPM^β / (d_bit · f_protodyakonov)  │  Wi = f(SED, ROP)",
            "live_calc": f"ROP = {rop:.1f} m/h  │  f = {f_prot:.1f}  │  Wi = {wi:.1f} kWh/t  │  SED = {sed:.1f} MJ/m³",
            "forces": "Bit Thrust WOB: 185 kN │ Rotary RPM: 95 rpm │ Drill String Torque: 8.4 kNm",
            "state_badge": pill_nominal("● DRILLING PATTERN"),
            "metrics": [
                ("MWD Penetration Rate", f"{rop:.1f} m/h"),
                ("Protodyakonov Hardness f", f"{f_prot:.1f} (Dacite Porphyry Bench)"),
                ("Bond Work Index Wi", f"{wi:.1f} kWh/t (Feedforward to Mill)"),
                ("Specific Energy SED", f"{sed:.1f} MJ/m³"),
                ("Blast Hole Depth", "16.5 m (Sub-drill 1.5 m)"),
                ("Holes Completed", f"{dr.get('holes_completed', {}).get('value', 14)} / 32 in Blast Block"),
            ]
        }

    # 14. Coarse Ore Stockpile Dome
    elif clean_id in ("stockpile-coarse-01", "stockpile"):
        st = data.get("stockpile-coarse-01", {})
        ton = st.get("live_tonnage_t", {}).get("value", 28500.0)
        h = st.get("surge_reserve_hours", {}).get("value", 19.0)
        return {
            "title": "Coarse Ore Stockpile Buffer Dome (stockpile-coarse-01)",
            "type": "Surge Reserve Mass Balance & Feedforward Mill Autonomy",
            "equation": "dM_stock/dt = Q_conveyor_in - Q_sag_feed  │  t_autonomy = M_live / Q_sag_feed",
            "live_calc": f"2400 t/h - 1500 t/h = +900 t/h  │  {ton:,.0f} t / 1500 t/h = {h:.1f} hours autonomy",
            "forces": "Surge Dome Capacity: 60,000 t │ Live Reclaim: 4x Apron Feeders",
            "state_badge": pill_nominal("● BUFFER OPTIMAL > 12h"),
            "metrics": [
                ("Live Surge Tonnage", f"{ton:,.0f} tonnes"),
                ("Autonomy Reserve", f"{h:.1f} hours of continuous SAG mill feed"),
                ("Inflow Rate", "2,400 t/h (From КНК-270 Overland Conveyor)"),
                ("Reclaim Outflow Rate", "1,500 t/h (Feed to SAG Mill МПСИ-90)"),
                ("Dome Fill Level", f"{(ton/60000.0)*100.0:.1f} % (Capacity 60,000 t)"),
                ("Dead Storage", "12,000 tonnes (Bulldozer assisted)"),
            ]
        }

    # 15. Overland Conveyor
    elif clean_id in ("conveyor-main-01", "conveyor"):
        cv = data.get("conveyor-main-01", {})
        tph = cv.get("mass_flow_tph", {}).get("value", 2400.0)
        kw = cv.get("power_kw", {}).get("value", 1122.0)
        tension = cv.get("belt_tension_kn", {}).get("value", 281.0)
        return {
            "title": "КНК-270 Overland Ore Conveyor (conveyor-main-01)",
            "type": "High-Angle Overland Belt Conveyance Dynamics & ISO 5048",
            "equation": "T_belt = m'_ore·g·L·(sinθ + f·cosθ)  │  P_motor = T_belt · v_belt / η_drive",
            "live_calc": f"T_belt = {tension:.1f} kN  │  v = 4.2 m/s  │  P = {tension:.1f}·4.2 / 0.95 = {kw:.0f} kW",
            "forces": "Drive Pulleys: 2x 630 kW VFD │ Belt Width: 1,400 mm Steel Cord St-2500",
            "state_badge": pill_nominal("● CONVEYING NOMINAL"),
            "metrics": [
                ("Mass Flow Rate", f"{tph:,.0f} t/h"),
                ("Motor Power", f"{kw:,.0f} kW"),
                ("Belt Tension", f"{tension:.1f} kN"),
                ("Belt Speed", "4.20 m/s"),
                ("Belt Rip Detection", "NOMINAL (Electromagnetic loop intact)"),
                ("Conveyor Length / Lift", "2.70 km length  │  +45.0 m vertical lift"),
            ]
        }

    # 16. BelAZ-76135 Dust Bowser
    elif clean_id in ("water-bowser-01", "bowser"):
        wb = data.get("water-bowser-01", {})
        tank = wb.get("water_level_l", {}).get("value", 85000)
        moist = wb.get("road_surface_moisture_pct", {}).get("value", 14.5)
        pm10_obj = wb.get("pm10_concentration_ug_m3") or wb.get("pm10_dust_ug_m3") or {}
        pm10 = pm10_obj.get("value", 32.4) if isinstance(pm10_obj, dict) else (pm10_obj if pm10_obj is not None else 32.4)
        spray = wb.get("spray_active", {}).get("value", True)
        mu_dry = 0.72
        gamma = 0.005
        mu_calc = mu_dry - gamma * moist
        return {
            "title": "BelAZ-76135 Auxiliary Dust Suppression & Road Bowser",
            "type": "Evaporation Kinetics, Road Wetting & ISO 3450 Traction Linkage",
            "equation": "w(x, t) = w_0·e^(-λ·t) + (Q_spray / [v_truck·B_road])  │  μ_eff(w) = μ_dry - γ·w",
            "live_calc": f"w = {moist:.1f}%  │  μ_eff = {mu_dry:.2f} - {gamma:.3f}·{moist:.1f} = {mu_calc:.3f}  │  PM10 = {pm10:.1f} μg/m³",
            "forces": "Tank: 85,000 L │ Rear Pressurized Spray Manifold: 450 L/min",
            "state_badge": pill_nominal("● DUST CONTROL ACTIVE") if spray else pill_warning("▲ SPRAY IDLE"),
            "metrics": [
                ("Water Tank Level", f"{tank:,.0f} L / 90,000 L (94.4%)"),
                ("Surface Moisture w", f"{moist:.1f} % (Optimal range 12-16%)"),
                ("Effective Traction μ", f"{mu_calc:.3f} (Maintains safe stopping distance)"),
                ("PM10 Dust Concentration", f"{pm10:.1f} μg/m³ (Sanitary standard < 50)"),
                ("Spray System Status", "ACTIVE (Pulse width modulated)" if spray else "OFFLINE"),
                ("Haul Road Sector", "Ramp +60m to -60m Main Arterial Link"),
            ]
        }

    # Fallback Generic Twin Inspector
    else:
        tw = data.get(clean_id, {})
        return {
            "title": f"Digital Twin Entity: {clean_id.upper()}",
            "type": "Eclipse Ditto Registered Thing (org.openegiz.mine)",
            "equation": "ThingState(t) = Features(t) + LifecyclePolicy",
            "live_calc": f"Registered Features: {len(tw.keys())} attributes online",
            "forces": f"MQTT Topic: telemetry/org.openegiz.mine:{clean_id}",
            "state_badge": pill_nominal("● ONLINE"),
            "metrics": [(k, str(v.get("value", v))) for k, v in list(tw.items())[:6]]
        }


# -----------------------------------------------------------------------------
# 8. INTERACTIVE WORKBENCH STATE & DOMAIN SELECTION HELPERS
# -----------------------------------------------------------------------------

class InteractiveWorkbenchState:
    """Maintains user-nudge offsets, simulated faults, and noise injection."""
    def __init__(self):
        self.faults = {}
        self.drift_active = {}
        self.target_grade_nudge = 0.0
        self.vfd_hz_nudge = 0.0
        self.spray_toggle = True

    def toggle_fault(self, unit_id: str) -> str:
        clean = unit_id.split(":")[-1] if ":" in unit_id else unit_id
        cur = self.faults.get(clean)
        if cur is None:
            self.faults[clean] = "GEN-1"
        elif cur == "GEN-1":
            self.faults[clean] = "GEN-2"
        else:
            self.faults[clean] = None
        return self.faults[clean]

    def toggle_drift(self, unit_id: str) -> bool:
        clean = unit_id.split(":")[-1] if ":" in unit_id else unit_id
        cur = self.drift_active.get(clean, False)
        self.drift_active[clean] = not cur
        return self.drift_active[clean]

    def nudge(self, unit_id: str, direction: int):
        clean = unit_id.split(":")[-1] if ":" in unit_id else unit_id
        if "grade" in clean.lower() or "blend" in clean.lower() or clean == "mine-01":
            self.target_grade_nudge += direction * 0.01
        elif "pump" in clean.lower() or "dewatering" in clean.lower():
            self.vfd_hz_nudge += direction * 2.5
        elif "bowser" in clean.lower() or "water" in clean.lower():
            self.spray_toggle = not self.spray_toggle

GLOBAL_WORKBENCH = InteractiveWorkbenchState()


def get_view_selectable_items(view_idx: int) -> list:
    """Returns the list of inspectable unit IDs for the active domain screen."""
    if view_idx == 1:
        return ["org.openegiz.mine:mine-01", "org.openegiz.mine:crusher-01"]
    elif view_idx == 2:
        return [f"org.openegiz.mine:truck-0{i}" for i in range(1, 9)] + ["org.openegiz.mine:water-bowser-01"]
    elif view_idx == 3:
        return [
            "org.openegiz.mine:drill-rig-01",
            "org.openegiz.mine:crusher-01",
            "org.openegiz.mine:conveyor-main-01",
            "org.openegiz.mine:stockpile-coarse-01",
            "org.openegiz.mine:sag-mill-01"
        ]
    elif view_idx == 4:
        return ["org.openegiz.mine:slope-radar-01", "org.openegiz.mine:pump-station-01"]
    elif view_idx == 5:
        return [
            "GradeBlendingController",
            "TrolleyEnergyManager",
            "TkphThermalProtector",
            "CrusherProtectionUnit",
            "DewateringController",
            "SensorDegradationSimulator"
        ]
    elif view_idx == 6:
        return [
            "org.openegiz.mine:mine-01",
            "org.openegiz.mine:bench-north",
            "org.openegiz.mine:bench-south",
            "org.openegiz.mine:excavator-01",
            "org.openegiz.mine:excavator-02",
            "org.openegiz.mine:trolley-line-01",
            "org.openegiz.mine:substation-01",
            "org.openegiz.mine:crusher-01",
            "org.openegiz.mine:crusher-standby-02",
            "org.openegiz.mine:conveyor-main-01",
            "org.openegiz.mine:stockpile-coarse-01",
            "org.openegiz.mine:sag-mill-01",
            "org.openegiz.mine:slope-radar-01",
            "org.openegiz.mine:pump-station-01",
            "org.openegiz.mine:drill-rig-01",
            "org.openegiz.mine:water-bowser-01",
        ]
    return ["org.openegiz.mine:mine-01"]


# -----------------------------------------------------------------------------
# 9. DEEP TASK INSPECTOR DRAWER COMPONENT (LEVEL 2 WORKBENCH)
# -----------------------------------------------------------------------------

def render_deep_inspector(unit_id: str, data: dict, width: int = 98) -> str:
    """
    Renders the dedicated Deep-Dive Engineering Inspector Drawer.
    Includes live substituted formulas, 60-second Braille chart, lineage trace, and micro-controls.
    """
    info = resolve_unit_physics(unit_id, data)
    lines = []

    # Drawer Header Banner
    lines.append(f"{BOLD}{FG_WHITE}ENGINEERING INSPECTOR WORKBENCH{RESET}  {FG_SLATE}::  {info['title']}{RESET}")
    lines.append(f"{FG_HAIRLINE}{'─' * (width - 4)}{RESET}")

    # Section 1: Symbolic + Substituted Numerical Formula
    lines.append(f"{BOLD}{FG_CYAN}1. GOVERNING PHYSICS & RUNTIME NUMERICAL RESOLVER{RESET}")
    lines.append(f"  {FG_SLATE}Equation  :{RESET} {FG_WHITE}{info['equation']}{RESET}")
    lines.append(f"  {FG_SLATE}Live Calc :{RESET} {BOLD}{FG_EMERALD}{info['live_calc']}{RESET}")
    lines.append(f"  {FG_SLATE}Dynamics  :{RESET} {FG_WHITE}{info['forces']}{RESET}")
    lines.append("")

    # Section 2: Full-Width 60-Second Braille Telemetry Chart
    lines.append(f"{BOLD}{FG_CYAN}2. 60-SECOND HIGH-RESOLUTION ROLLING TELEMETRY CHART{RESET}")
    clean_id = unit_id.split(":")[-1] if ":" in unit_id else unit_id

    if clean_id.startswith("truck"):
        pts = GLOBAL_HISTORY.truck_speed.get(clean_id, [0])
        lbl = "Speed (km/h)"
    elif "radar" in clean_id:
        pts = GLOBAL_HISTORY.fos
        lbl = "Mohr-Coulomb FoS"
    elif "sag" in clean_id:
        pts = GLOBAL_HISTORY.sag_power
        lbl = "SAG Power (kW)"
    elif "pump" in clean_id or "dewatering" in clean_id:
        pts = GLOBAL_HISTORY.sump_level
        lbl = "Sump Water Level (m)"
    else:
        pts = GLOBAL_HISTORY.grade
        lbl = "Blended Ore Grade (% Cu)"

    p_list = list(pts) if pts else [0.0]
    min_p = min(p_list) if p_list else 0.0
    max_p = max(p_list) if p_list else 1.0
    mean_p = sum(p_list) / len(p_list) if p_list else 0.0
    chart_bar = braille_sparkline(p_list, width=44, color=FG_CYAN)

    lines.append(f"  {FG_SLATE}{lbl:24}{RESET} [{chart_bar}]  {FG_WHITE}Min: {min_p:.2f}  │  Max: {max_p:.2f}  │  Mean: {mean_p:.2f}{RESET}")
    lines.append("")

    # Section 3: Telemetry Matrix
    lines.append(f"{BOLD}{FG_CYAN}3. TELEMETRY ATTRIBUTES & RUNTIME SENSORS{RESET}")
    for k, v in info["metrics"]:
        lines.append(f"  {FG_SLATE}{k:26}:{RESET} {FG_WHITE}{v}{RESET}")
    lines.append("")

    # Section 4: Data Pipeline & Ditto Lineage Trace
    lines.append(f"{BOLD}{FG_CYAN}4. DITTO DATA LINEAGE & ABAC SECURITY ENFORCEMENT{RESET}")
    lines.append(f"  {FG_SLATE}MQTT Topic  :{RESET} {FG_WHITE}telemetry/org.openegiz.mine:{clean_id}{RESET}")
    lines.append(f"  {FG_SLATE}Payload Size:{RESET} {FG_WHITE}328 bytes (Ditto Protocol v2 JSON Modify Event){RESET}")
    lines.append(f"  {FG_SLATE}ABAC Policy :{RESET} {FG_EMERALD}Principal 'process-engineer' (R/W)  │  'security-auditor' (Audit-Only){RESET}")
    lines.append(f"  {FG_SLATE}Data Chain  :{RESET} {FG_WHITE}Sensor RTU ──> MQTT Mosquitto ──> Eclipse Ditto ──> InfluxDB ──> Grafana{RESET}")
    lines.append("")

    # Section 5: Contextual Micro-Controls Guide & Live Parameter Status
    f_stat = GLOBAL_WORKBENCH.faults.get(clean_id)
    d_stat = GLOBAL_WORKBENCH.drift_active.get(clean_id, False)
    f_tag = pill_critical(f"■ {f_stat}") if f_stat == "GEN-2" else (pill_warning(f"▲ {f_stat}") if f_stat == "GEN-1" else f"{FG_EMERALD}NOMINAL{RESET}")
    d_tag = f"{FG_AMBER}+0.05% DRIFT ACTIVE{RESET}" if d_stat else f"{FG_SLATE}CALIBRATED{RESET}"

    if "grade" in clean_id.lower() or "blend" in clean_id.lower() or clean_id == "mine-01":
        nudge_lbl = f"Target Cu {0.850 + GLOBAL_WORKBENCH.target_grade_nudge:.3f}% ({GLOBAL_WORKBENCH.target_grade_nudge:+.3f}%)"
    elif "pump" in clean_id.lower() or "dewatering" in clean_id.lower():
        nudge_lbl = f"VFD {47.8 + GLOBAL_WORKBENCH.vfd_hz_nudge:.1f} Hz ({GLOBAL_WORKBENCH.vfd_hz_nudge:+.1f} Hz)"
    elif "bowser" in clean_id.lower() or "water" in clean_id.lower():
        nudge_lbl = f"Spray {'ACTIVE' if GLOBAL_WORKBENCH.spray_toggle else 'MUTED'}"
    else:
        nudge_lbl = "Setpoint ±0.00"

    badge_pill = pill_critical(f"■ {f_stat} FAULT") if f_stat == "GEN-2" else (pill_warning(f"▲ {f_stat} DEGRADED") if f_stat == "GEN-1" else info["state_badge"])

    lines.append(f"{FG_HAIRLINE}{'─' * (width - 4)}{RESET}")
    lines.append(f"  {BOLD}{FG_GOLD}[f]{RESET} {FG_SLATE}Fault Control:{RESET} {f_tag}  │  "
                 f"{BOLD}{FG_GOLD}[n]{RESET} {FG_SLATE}Noise/Drift:{RESET} {d_tag}  │  "
                 f"{BOLD}{FG_GOLD}[+]/[-]{RESET} {FG_SLATE}Nudge:{RESET} {FG_WHITE}{nudge_lbl}{RESET}")
    lines.append(f"  {BOLD}{FG_CYAN}[Esc / Backspace]{RESET} {FG_WHITE}Return to Domain View{RESET}  │  "
                 f"{BOLD}{FG_WHITE}[q]{RESET} {FG_SLATE}Exit SCADA Console{RESET}")

    return material_card(
        title=f"DEEP TASK INSPECTOR WORKBENCH: {clean_id.upper()}",
        lines=lines,
        is_active=True,
        width=width,
        badge_pill=badge_pill
    )

# -----------------------------------------------------------------------------
# 9. DOMAIN SCREENS (VIEWS 1 TO 6)
# -----------------------------------------------------------------------------

def render_domain_view(view_idx: int, data: dict, active_cursor: int = 0, width: int = 98) -> str:
    """Renders one of the 6 core Material Design domain screens."""
    GLOBAL_HISTORY.record(data)
    m01 = data.get("mine-01", {})
    cards = []

    # Navigation Ribbon
    views_labels = [
        "1. SYNOPTIC FLOW",
        "2. FLEET & BRAKING",
        "3. PLANT & SAG",
        "4. GEOTECH & SUMP",
        "5. EKF-PID WORKBENCH",
        "6. TWIN & ABAC"
    ]
    ribbon_parts = []
    for i, v_name in enumerate(views_labels, start=1):
        if i == view_idx:
            ribbon_parts.append(f"{BG_CARD_ACTIVE}{BOLD}{FG_CYAN}  {v_name}  {RESET}")
        else:
            ribbon_parts.append(f"{BG_HEADER}{FG_SLATE}  {v_name}  {RESET}")
    nav_line = "".join(ribbon_parts)
    cards.append(f"\n{nav_line}\n")

    # -------------------------------------------------------------------------
    # VIEW 1: ENTERPRISE SYNOPTIC FLOW & MASS BALANCE
    # -------------------------------------------------------------------------
    if view_idx == 1:
        # Card 1: Enterprise Header Ribbon
        emg = m01.get("emergency_level", {}).get("value", "NORMAL")
        badge = pill_nominal() if emg == "NORMAL" else pill_critical(f"■ {emg}")
        tonnes = m01.get("tonnes_mined", {}).get("value", 0.0)
        grade = m01.get("avg_grade", {}).get("value", 0.850)
        opex = m01.get("opex_per_tonne", {}).get("value", 0.980)
        npv = m01.get("npv_usd", {}).get("value", 18422727.0)
        irr = m01.get("irr_pct", {}).get("value", 68.0)
        avoided = m01.get("prevented_loss_usd", {}).get("value", 0.0)

        lines1 = [
            f"{FG_SLATE}Mined Material :{RESET} {BOLD}{FG_WHITE}{tonnes:,.1f} tonnes{RESET}  │  "
            f"{FG_SLATE}Feed Grade :{RESET} {BOLD}{FG_WHITE}{grade:.3f}% Cu{RESET} (Target 0.850%)  │  "
            f"{FG_SLATE}Mining OPEX :{RESET} {FG_EMERALD}${opex:.2f}/t{RESET}",
            f"{FG_SLATE}Financial Model:{RESET} {FG_EMERALD}NPV +${npv/1e6:.2f}M (10y @ 10%){RESET}  │  "
            f"{FG_SLATE}IRR / Payback:{RESET} {FG_CYAN}{irr:.1f}% / 1.26 Yrs{RESET}  │  "
            f"{FG_SLATE}Avoided Risk:{RESET} {FG_EMERALD}${avoided:,.0f}{RESET}",
            f"{FG_SLATE}Quality PID    :{RESET} {setpoint_slider(grade)}  {FG_SLATE}Deviation:{RESET} {FG_WHITE}{(grade-0.850):+.3f}% Cu{RESET}",
            f"{FG_SLATE}Grafana SCADA   :{RESET} {FG_EMERALD}ONLINE (http://localhost:3000){RESET}  │  {FG_SLATE}6-Wheel Contact:{RESET} {FG_EMERALD}100% Surface Lock{RESET}  │  {FG_SLATE}Ventilation:{RESET} {FG_CYAN}VSP-1800{RESET}"
        ]
        cards.append(material_card("ENTERPRISE OPERATIONS COMMAND (ГОК «АҚТАУ-МЫС»)", lines1, is_active=(active_cursor == 0), width=width, badge_pill=badge))

        # Card 2: Synoptic Flow Chain
        cr = data.get("crusher-01", {})
        cv = data.get("conveyor-main-01", {})
        st = data.get("stockpile-coarse-01", {})
        sag = data.get("sag-mill-01", {})

        c_tph = cr.get("throughput_tph", {}).get("value", 2400.0)
        cv_tph = cv.get("mass_flow_tph", {}).get("value", 2400.0)
        st_ton = st.get("live_tonnage_t", {}).get("value", 28500.0)
        sag_kw = sag.get("power_kw", {}).get("value", 6072.0)
        rec = sag.get("flotation_recovery_cu_pct", {}).get("value", 90.50)

        lines2 = [
            f"{BOLD}{FG_CYAN}MATERIAL CONVEYANCE CHAIN:{RESET}",
            f"  {FG_SLATE}Face Excavation{RESET}  ──>  {BOLD}{FG_EMERALD}Flagship BelAZ-75131 #01 (136t · 1200V DC){RESET}  ──>  "
            f"{FG_SLATE}KKD-1500 Crusher{RESET} ({c_tph:,.0f} t/h)  ──>",
            f"  {FG_SLATE}Overland Conveyor{RESET} ({cv_tph:,.0f} t/h)  ──>  "
            f"{FG_SLATE}Stockpile Dome{RESET} ({st_ton:,.0f} t live)  ──>  "
            f"{FG_SLATE}SAG Mill МПСИ-90{RESET} ({sag_kw:,.0f} kW, {rec:.1f}% Cu)",
            f"{FG_HAIRLINE}{'─' * (width - 8)}{RESET}",
            f"{FG_SLATE}Real-Time Trend Wave (Cu %):{RESET} {braille_sparkline(GLOBAL_HISTORY.grade, width=38)}  {FG_SLATE}SAG Power Wave:{RESET} {braille_sparkline(GLOBAL_HISTORY.sag_power, width=24)}"
        ]
        cards.append(material_card("SYNOPTIC ORE EXTRACTION & BENEFICIATION FLOW", lines2, is_active=(active_cursor == 1), width=width))

    # -------------------------------------------------------------------------
    # VIEW 2: HAULAGE KINEMATICS, QUEUES & WET BRAKING MATRIX
    # -------------------------------------------------------------------------
    elif view_idx == 2:
        tr = data.get("truck-01", {})
        km = tr.get("route_position", {}).get("value", 1.84)
        spd = tr.get("speed", {}).get("value", 24.5)
        prop = tr.get("propulsion_mode", {}).get("value", "trolley_assist")
        payload = tr.get("payload", {}).get("value", 136.0)
        tkph = tr.get("tkph", {}).get("value", 1016.0)
        d_stop = tr.get("braking_distance_m", {}).get("value", 13.4)
        mu = tr.get("traction_mu_eff", {}).get("value", 0.650)
        trolley_active = tr.get("trolley_mode", {}).get("value", 1) == 1
        p_pill = pill_trolley("⚡ 1200V DC [ON-GRID]") if trolley_active else pill_diesel()
        bar = subpixel_meter(km, 3.6, width=16, color_mode="cyan")
        tkph_bar = subpixel_meter(tkph, 1200.0, width=12, color_mode="auto")

        x = tr.get("pos_x", {}).get("value", 82.4)
        y = tr.get("pos_y", {}).get("value", 20.5)
        z = tr.get("pos_z", {}).get("value", 44.1)
        grade = tr.get("grade_pct", {}).get("value", 10.0)
        bank = tr.get("bank_deg", {}).get("value", 2.8)

        diesel_lph = 24.5 if trolley_active else 142.0
        pwr_kw = 1104.0 if trolley_active else 0.0

        lines = [
            f"{BOLD}{FG_CYAN}FLAGSHIP HAUL TRUCK BELAZ-75131 #01 (136t · 1200V DC TROLLEY-ASSIST):{RESET}",
            f"  {FG_SLATE}Ramp Chainage PK :{RESET} [{bar}] {BOLD}{FG_WHITE}{km:4.2f} km{RESET} / 3.60 km  │  {p_pill}  │  {FG_SLATE}Speed:{RESET} {BOLD}{FG_WHITE}{spd:4.1f} km/h{RESET}",
            f"  {FG_SLATE}3D Spatial Datum :{RESET} {FG_WHITE}X={x:+.1f}m, Y={y:+.1f}m, Z={z:+.1f}m{RESET}  │  {FG_SLATE}Gradient:{RESET} {FG_EMERALD}{grade:+.1f}%{RESET}  │  {FG_SLATE}Camber Roll:{RESET} {FG_CYAN}{bank:.1f}°{RESET}",
            f"  {FG_SLATE}Powertrain Flow  :{RESET} {FG_CYAN}Electric Draw: {pwr_kw:,.0f} kW{RESET}  │  {FG_SLATE}Fuel Burn:{RESET} {FG_EMERALD}{diesel_lph:.1f} L/h (-82.7% via Catenary){RESET}",
            f"  {FG_SLATE}Payload & Chassis:{RESET} {BOLD}{FG_WHITE}{payload:3.0f} tonnes{RESET} Cu-Mo Ore  │  {FG_SLATE}Bed Angle:{RESET} {FG_WHITE}0.0°{RESET}  │  {FG_SLATE}4x Struts Pressure:{RESET} {FG_WHITE}16.4 MPa{RESET}",
            f"  {FG_SLATE}6-Wheel Contact  :{RESET} {FG_SLATE}FL/FR/RLO/RLI/RRO/RRI:{RESET} {FG_EMERALD}100% Surface Conformance (0.0m floating){RESET}",
            f"  {FG_SLATE}Tire Thermal Load:{RESET} {FG_WHITE}TKPH {tkph:,.0f}{RESET} [{tkph_bar}]  │  {FG_SLATE}ISO 3450 Stopping Dist:{RESET} {BOLD}{FG_EMERALD}{d_stop:4.1f} m{RESET} (μ={mu:.2f})",
            f"  {FG_SLATE}Obstacle Radar   :{RESET} {FG_EMERALD}Berm Clearance: 4.2m [CLEAR]{RESET}  │  {FG_SLATE}Anti-Collision:{RESET} {FG_EMERALD}ONLINE{RESET}  │  {FG_SLATE}Beacon:{RESET} {FG_GOLD}ACTIVE{RESET}"
        ]

        cards.append(material_card("FLAGSHIP HAUL FLEET TELEMETRY & ISO 3450 BRAKING (BelAZ-75131 #01)", lines, is_active=(active_cursor == 0), width=width))

        # Water bowser line
        wb = data.get("water-bowser-01", {})
        spray = "ACTIVE (450 L/min)" if wb.get("spray_active", {}).get("value", True) else "OFFLINE"
        w_lines = [
            f"{FG_SLATE}BelAZ-76135 Dust Bowser :{RESET} {FG_WHITE}Tank {wb.get('water_level_l', {}).get('value', 85000):,.0f} L{RESET}  │  "
            f"{FG_SLATE}Nozzle Spray:{RESET} {FG_CYAN}{spray}{RESET}  │  "
            f"{FG_SLATE}Road Moisture w:{RESET} {FG_WHITE}{wb.get('road_surface_moisture_pct', {}).get('value', 14.5):.1f}%{RESET}  │  "
            f"{FG_SLATE}PM10 Dust:{RESET} {FG_WHITE}{(wb.get('pm10_concentration_ug_m3') or wb.get('pm10_dust_ug_m3') or {}).get('value', 32.4):.1f} μg/m³{RESET}"
        ]
        cards.append(material_card("AUXILIARY DUST SUPPRESSION & WET TRACTION GOVERNANCE", w_lines, is_active=(active_cursor == 8), width=width))

    # -------------------------------------------------------------------------
    # VIEW 3: DRILLING, COMMINUTION, CONVEYOR, STOCKPILE & SAG MILL
    # -------------------------------------------------------------------------
    elif view_idx == 3:
        # Drill rig
        dr = data.get("drill-rig-01", {})
        dr_lines = [
            f"{FG_SLATE}MWD Penetration ROP:{RESET} {FG_WHITE}{dr.get('rop_m_per_h', {}).get('value', 30.0):.1f} m/h{RESET}  │  "
            f"{FG_SLATE}Protodyakonov f:{RESET} {FG_WHITE}{dr.get('protodyakonov_hardness_f', {}).get('value', 11.8):.1f}{RESET}  │  "
            f"{FG_SLATE}Bond Work Index Wi:{RESET} {FG_WHITE}{dr.get('bond_work_index_kwh_t', {}).get('value', 15.4):.1f} kWh/t{RESET}",
            f"{FG_SLATE}Rotary Torque      :{RESET} {FG_WHITE}{dr.get('rotary_torque_knm', {}).get('value', 8.4):.1f} kNm{RESET}  │  "
            f"{FG_SLATE}Specific Energy SED:{RESET} {FG_WHITE}{dr.get('sed_mj_m3', {}).get('value', 42.1):.1f} MJ/m³{RESET}  │  "
            f"{FG_SLATE}Holes Drilled     :{RESET} {FG_WHITE}{dr.get('holes_completed', {}).get('value', 14)} blast holes{RESET}"
        ]
        cards.append(material_card("EPIROC PIT VIPER 271 DRILL RIG (drill-rig-01)", dr_lines, is_active=(active_cursor == 0), width=width))

        # Crusher & Conveyor
        cr = data.get("crusher-01", {})
        cv = data.get("conveyor-main-01", {})
        c_lines = [
            f"{FG_SLATE}KKD-1500/180 Throughput:{RESET} {FG_EMERALD}{cr.get('throughput_tph', {}).get('value', 2400.0):,.0f} t/h{RESET}  │  "
            f"{FG_SLATE}Feed Grade:{RESET} {FG_WHITE}{cr.get('feed_grade', {}).get('value', 0.850):.3f}% Cu{RESET}  │  "
            f"{FG_SLATE}Vibration:{RESET} {FG_WHITE}{cr.get('vibration_rms', {}).get('value', 1.8):.2f} mm/s{RESET}",
            f"{FG_SLATE}КНК-270 Overland Conveyor:{RESET} {FG_WHITE}{cv.get('mass_flow_tph', {}).get('value', 2400.0):,.0f} t/h{RESET}  │  "
            f"{FG_SLATE}Belt Tension:{RESET} {FG_WHITE}{cv.get('belt_tension_kn', {}).get('value', 281.0):.1f} kN{RESET}  │  "
            f"{FG_SLATE}Conveyor Power:{RESET} {FG_WHITE}{cv.get('power_kw', {}).get('value', 1122.0):.0f} kW{RESET}"
        ]
        cards.append(material_card("PRIMARY GYRATORY CRUSHER & OVERLAND CONVEYOR (КНК-270)", c_lines, is_active=(active_cursor == 1), width=width))

        # Stockpile & SAG Mill
        st = data.get("stockpile-coarse-01", {})
        sag = data.get("sag-mill-01", {})
        st_ton = st.get("live_tonnage_t", {}).get("value", 28500.0)
        autonomy_h = st.get("surge_reserve_hours", {}).get("value", 19.0)
        st_bar = subpixel_meter(autonomy_h, 24.0, width=16, color_mode="cyan")
        sag_kw = sag.get("power_kw", {}).get("value", 6072.0)
        rec = sag.get("flotation_recovery_cu_pct", {}).get("value", 90.50)

        s_lines = [
            f"{FG_SLATE}Stockpile Surge Live Tonnage:{RESET} {FG_WHITE}{st_ton:,.0f} tonnes{RESET}  │  "
            f"{FG_SLATE}Autonomy Reserve:{RESET} {FG_WHITE}{autonomy_h:.1f} hours{RESET} [{st_bar}]",
            f"{FG_SLATE}МПСИ-90 SAG Comminution Power:{RESET} {FG_CYAN}{sag_kw:,.0f} kW{RESET}  │  "
            f"{FG_SLATE}Cu Recovery:{RESET} {FG_EMERALD}{rec:.2f} %{RESET}  │  "
            f"{FG_SLATE}Specific Energy:{RESET} {FG_WHITE}{sag.get('specific_energy_kwh_t', {}).get('value', 4.05):.2f} kWh/t{RESET}"
        ]
        cards.append(material_card("COARSE ORE STOCKPILE DOME & SAG MILL BENEFICIATION", s_lines, is_active=(active_cursor == 2), width=width))

    # -------------------------------------------------------------------------
    # VIEW 4: GEOMECHANICAL SLOPE RADAR & HYDROGEOLOGY
    # -------------------------------------------------------------------------
    elif view_idx == 4:
        sr = data.get("slope-radar-01", {})
        fos = sr.get("factor_of_safety_fos", {}).get("value", 1.36)
        u_kpa = sr.get("pore_pressure_kpa", {}).get("value", 56.3)
        v_def = sr.get("deformation_velocity_mm_h", {}).get("value", 0.12)
        inv_v = sr.get("inverse_velocity_h_mm", {}).get("value", 8.33)
        alarm = sr.get("slope_alarm_status", {}).get("value", "NORMAL")

        fos_bar = subpixel_meter(fos - 1.0, 0.50, width=16, color_mode="emerald" if fos > 1.30 else "crimson")
        badge = pill_nominal("● STABLE FoS > 1.35") if fos >= 1.35 else pill_critical("■ EVACUATION INTERLOCK")

        sr_lines = [
            f"{FG_SLATE}Mohr-Coulomb Factor of Safety:{RESET} {BOLD}{FG_WHITE}{fos:.2f} FoS{RESET} [{fos_bar}]  │  "
            f"{FG_SLATE}Alarm Status:{RESET} {FG_WHITE}{alarm}{RESET}",
            f"{FG_SLATE}Pore Water Pressure u(t)     :{RESET} {FG_WHITE}{u_kpa:.1f} kPa{RESET}  │  "
            f"{FG_SLATE}Deformation Velocity:{RESET} {FG_WHITE}{v_def:.2f} mm/h{RESET}",
            f"{FG_SLATE}Fukuzono Inverse Velocity    :{RESET} {FG_CYAN}{inv_v:.2f} h/mm{RESET}  │  "
            f"{FG_SLATE}Evacuation Interlock:{RESET} {'ACTIVE' if fos < 1.15 else 'STANDBY DISENGAGED'}"
        ]
        cards.append(material_card("GROUNDPROBE SSR-XT GEOMECHANICAL SLOPE RADAR", sr_lines, is_active=(active_cursor == 0), width=width, badge_pill=badge))

        ps = data.get("pump-station-01", {})
        lvl = ps.get("sump_water_level_m", {}).get("value", 1.15)
        q_in = ps.get("water_influx_m3h", {}).get("value", 45.0)
        q_out = ps.get("pump_flow_m3h", {}).get("value", 48.0)
        aux = ps.get("aux_pump_status", {}).get("value", "STANDBY")
        lvl_bar = subpixel_meter(lvl, 2.50, width=16, color_mode="cyan" if lvl < 2.0 else "crimson")

        ps_lines = [
            f"{FG_SLATE}Deep Pit Sump Level (-60m)   :{RESET} {BOLD}{FG_WHITE}{lvl:.2f} m{RESET} [{lvl_bar}]  │  "
            f"{FG_SLATE}Limit Threshold:{RESET} {FG_WHITE}2.50 m{RESET}",
            f"{FG_SLATE}Hydrogeological Inflow Q_in  :{RESET} {FG_WHITE}{q_in:.1f} m³/h{RESET}  │  "
            f"{FG_SLATE}Pumping Discharge Q_out:{RESET} {FG_EMERALD}{q_out:.1f} m³/h{RESET}",
            f"{FG_SLATE}Duty VFD Centrifugal WP-01   :{RESET} {FG_WHITE}Active (48 m³/h){RESET}  │  "
            f"{FG_SLATE}Emergency Pontoon WP-02:{RESET} {FG_WHITE}{aux}{RESET}"
        ]
        cards.append(material_card("HORIZON -60M PIT DEWATERING & AUTOMATIC ATS PONTOON", ps_lines, is_active=(active_cursor == 1), width=width))

    # -------------------------------------------------------------------------
    # VIEW 5: AUTONOMOUS CONTROLLERS & EKF-PID WORKBENCH
    # -------------------------------------------------------------------------
    elif view_idx == 5:
        modules = [
            ("GradeBlendingController", "Discrete EKF Cu Estimator & Adaptive Lyapunov PID Dispatcher", "Cu 0.850% ±0.03%"),
            ("TrolleyEnergyManager", "1200V DC Catenary Substation, BESS Peak-Shaving & Regeneration", "1200V / 3040 kW"),
            ("TkphThermalProtector", "Continuous Tire Heat ODE Integration & Proactive Speed Derating", "TKPH 175.5 Limit"),
            ("CrusherProtectionUnit", "Primary Gyratory Tramp Metal Relief & Standby LT140 Auto-Transfer", "2400 t/h Nominal"),
            ("DewateringController", "Sump Mass Balance ODE, VFD Staging & Heavy Slurry Pontoon ATS", "Level 1.15m / 2.5m"),
            ("SensorDegradationSimulator", "Telemetry Thermal Drift, Packet Dropout & CRC Noise Injection", "Packet Loss 0.1%")
        ]
        m_lines = []
        for i, (m_name, desc, metric_str) in enumerate(modules):
            is_active = (active_cursor == i)
            cursor_mark = f"{FG_CYAN}▶{RESET}" if is_active else " "
            m_lines.append(f"{cursor_mark} {BOLD}{FG_WHITE}{m_name:28}{RESET} {FG_SLATE}{desc:52}{RESET} {FG_CYAN}{metric_str}{RESET}")

        cards.append(material_card("AUTONOMOUS CONTROL ENGINE & EKF-PID REGULATOR MODULES", m_lines, is_active=True, width=width))

    # -------------------------------------------------------------------------
    # VIEW 6: ECLIPSE DITTO TWIN & ABAC SECURITY REGISTRY
    # -------------------------------------------------------------------------
    elif view_idx == 6:
        t_lines = [
            f"{BOLD}{FG_WHITE}{'Digital Twin Identifier':34} {'Category':18} {'Packet Loss':14} {'SNR':10} {'ABAC Role'}{RESET}",
            f"{FG_HAIRLINE}{'─' * (width - 8)}{RESET}"
        ]
        twins = [
            ("org.openegiz.mine:mine-01", "Enterprise Operations", "0.0 %", "34 dB", "mining-operator"),
            ("org.openegiz.mine:bench-north", "Geological Face", "0.0 %", "36 dB", "mining-operator"),
            ("org.openegiz.mine:bench-south", "Geological Face", "0.0 %", "35 dB", "mining-operator"),
            ("org.openegiz.mine:truck-01", "Flagship BelAZ Haul", "0.1 %", "32 dB", "mining-operator"),
            ("org.openegiz.mine:excavator-01", "Shovel Mining", "0.2 %", "29 dB", "mining-operator"),
            ("org.openegiz.mine:excavator-02", "Shovel Mining", "0.4 %", "28 dB", "mining-operator"),
            ("org.openegiz.mine:trolley-line-01", "Power Grid Catenary", "0.1 %", "31 dB", "process-engineer"),
            ("org.openegiz.mine:substation-01", "BESS Microgrid", "0.1 %", "32 dB", "process-engineer"),
            ("org.openegiz.mine:crusher-01", "Mineral Beneficiation", "0.1 %", "30 dB", "process-engineer"),
            ("org.openegiz.mine:crusher-standby-02", "Mobile Standby", "0.0 %", "31 dB", "process-engineer"),
            ("org.openegiz.mine:conveyor-main-01", "Overland Conveyance", "0.1 %", "30 dB", "process-engineer"),
            ("org.openegiz.mine:stockpile-coarse-01", "Buffer Surge Dome", "0.0 %", "33 dB", "process-engineer"),
            ("org.openegiz.mine:sag-mill-01", "Grinding Comminution", "0.1 %", "30 dB", "process-engineer"),
            ("org.openegiz.mine:slope-radar-01", "Geotechnical Radar", "0.1 %", "31 dB", "security-auditor"),
            ("org.openegiz.mine:pump-station-01", "Hydrogeology Sump", "0.2 %", "29 dB", "process-engineer"),
            ("org.openegiz.mine:drill-rig-01", "Autonomous Drilling", "0.2 %", "28 dB", "mining-operator"),
            ("org.openegiz.mine:water-bowser-01", "Dust Suppression", "0.1 %", "30 dB", "mining-operator"),
        ]
        for i, (tid, cat, pl, snr, role) in enumerate(twins):
            is_active = (active_cursor == i)
            cursor_mark = f"{FG_CYAN}▍{RESET} " if is_active else "  "
            t_lines.append(f"{cursor_mark}{BOLD if is_active else ''}{FG_WHITE}{tid:34}{RESET} {FG_SLATE}{cat:18}{RESET} {FG_EMERALD}{pl:14}{RESET} {FG_CYAN}{snr:10}{RESET} {FG_SLATE}{role}{RESET}")

        cards.append(material_card("ECLIPSE DITTO DIGITAL TWIN REGISTRY & ABAC POLICIES (17 TWINS · 1 FLAGSHIP FLEET)", t_lines, is_active=True, width=width))

    # Bottom Instructions Bar
    footer = (
        f"  {FG_SLATE}Navigation:{RESET} {BOLD}{FG_WHITE}[1..6]{RESET} {FG_SLATE}Switch Domain View{RESET}  │  "
        f"{BOLD}{FG_WHITE}[↑/↓/j/k]{RESET} {FG_SLATE}Move Cursor{RESET}  │  "
        f"{BOLD}{FG_CYAN}[Enter/Space]{RESET} {FG_WHITE}Open Deep Task Inspector Drawer{RESET}  │  "
        f"{BOLD}{FG_WHITE}[q]{RESET} {FG_SLATE}Exit{RESET}"
    )
    cards.append(footer)

    return "\n".join(cards)

# -----------------------------------------------------------------------------
# 10. NON-BLOCKING KEYBOARD INPUT SYSTEM
# -----------------------------------------------------------------------------

def read_key_nonblocking() -> str:
    """Reads keyboard input in raw non-blocking mode on POSIX terminals."""
    if not sys.stdin.isatty():
        return ""
    try:
        import select
        r, _, _ = select.select([sys.stdin], [], [], 0.05)
        if r:
            ch1 = sys.stdin.read(1)
            if ch1 == "\x1b":
                r2, _, _ = select.select([sys.stdin], [], [], 0.05)
                if r2:
                    ch2 = sys.stdin.read(1)
                    if ch2 == "[":
                        r3, _, _ = select.select([sys.stdin], [], [], 0.05)
                        if r3:
                            ch3 = sys.stdin.read(1)
                            if ch3 == "A": return "UP"
                            if ch3 == "B": return "DOWN"
                            if ch3 == "C": return "RIGHT"
                            if ch3 == "D": return "LEFT"
                return "ESC"
            return ch1
    except Exception:
        pass
    return ""
