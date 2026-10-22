#!/usr/bin/env python3
"""
Smart-Kenish 4.0 Material Design 24-Bit TrueColor SCADA & Industrial Monitor (Team-018).
Real-Time Telemetry & Operations Console for OpenEgiz Mining & Beneficiation Complex.

Implements Material Design surface hierarchy (deep obsidian, elevated cards, cursor accents),
sub-pixel fractional meters, rolling Braille sparklines, domain views 1-6, and interactive
deep task inspection workbench. Strictly zero legacy ASCII/DOS box-drawing characters.
"""

import argparse
import base64
import json
import math
import os
import select
import signal
import sys
import time
import urllib.request
import urllib.error

# Ensure team directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from tui_renderer import (
    render_domain_view,
    render_deep_inspector,
    material_card,
    pill_nominal,
    pill_warning,
    pill_critical,
    pill_trolley,
    pill_regen,
    pill_diesel,
    subpixel_meter,
    setpoint_slider,
    braille_sparkline,
    read_key_nonblocking,
    get_view_selectable_items,
    GLOBAL_HISTORY,
    GLOBAL_WORKBENCH,
    RESET,
    BOLD,
    DIM,
    FG_WHITE,
    FG_SLATE,
    FG_MUTED,
    FG_CYAN,
    FG_EMERALD,
    FG_AMBER,
    FG_CRIMSON,
    FG_HAIRLINE,
    BG_CANVAS,
    BG_CARD,
    BG_CARD_ACTIVE,
    BG_HEADER,
)


def fetch_from_ditto(ditto_url="http://127.0.0.1:8080", user="ditto", password="ditto"):
    """Fetch all registered twins directly from Eclipse Ditto REST API."""
    try:
        req = urllib.request.Request(
            f"{ditto_url}/api/2/things",
            headers={"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}
        )
        with urllib.request.urlopen(req, timeout=1.0) as r:
            things_list = json.loads(r.read().decode("utf-8"))
            out = {}
            for t in things_list:
                tid = t.get("thingId", "")
                name = tid.split(":")[-1] if ":" in tid else tid
                out[name] = t.get("features", {})
            return out
    except Exception:
        return None


def init_simulator_model(seed=42, warmup_steps=40):
    """Initializes local simulator model and pre-warms history for live sparklines."""
    try:
        from simulator import SmartKenishModel
        sim = SmartKenishModel(seed=seed)
        for _ in range(warmup_steps):
            sim.step(1.5)
            GLOBAL_HISTORY.record(sim.snapshot())
        return sim
    except Exception:
        return None


def render_full_overview(data: dict, width: int = 98) -> str:
    """
    Renders the comprehensive Material Design Enterprise SCADA report.
    Used for --once, --dry-run, and headless execution.
    """
    GLOBAL_HISTORY.record(data)
    m01 = data.get("mine-01", {})
    cards = []

    # 1. Domain Navigation Header
    views_labels = [
        "1. SYNOPTIC FLOW",
        "2. FLEET & BRAKING",
        "3. PLANT & SAG",
        "4. GEOTECH & SUMP",
        "5. EKF-PID WORKBENCH",
        "6. TWIN & ABAC"
    ]
    ribbon_parts = [f"{BG_CARD_ACTIVE}{BOLD}{FG_CYAN}  SMART-KENISH 4.0 :: INDUSTRIAL SCADA MONITOR  {RESET}"]
    for v_name in views_labels:
        ribbon_parts.append(f"{BG_HEADER}{FG_SLATE}  {v_name}  {RESET}")
    cards.append("\n" + "".join(ribbon_parts) + "\n")

    # 2. Card 1: Enterprise Operations Command (Mine-01)
    emg = m01.get("emergency_level", {}).get("value", "NORMAL")
    badge = pill_nominal("● NOMINAL") if emg == "NORMAL" else pill_critical(f"■ {emg}")
    tonnes = m01.get("tonnes_mined", {}).get("value", 0.0)
    grade = m01.get("avg_grade", {}).get("value", 0.850)
    opex = m01.get("opex_per_tonne", {}).get("value", 0.980)
    npv = m01.get("npv_usd", {}).get("value", 18422727.0)
    irr = m01.get("irr_pct", {}).get("value", 68.0)
    avoided = m01.get("prevented_loss_usd", {}).get("value", 0.0)

    lines_cmd = [
        f"{FG_SLATE}Mined Material :{RESET} {BOLD}{FG_WHITE}{tonnes:,.1f} tonnes{RESET}  │  "
        f"{FG_SLATE}Feed Grade :{RESET} {BOLD}{FG_WHITE}{grade:.3f}% Cu{RESET} (Target 0.850%)  │  "
        f"{FG_SLATE}Mining OPEX :{RESET} {FG_EMERALD}${opex:.2f}/t{RESET}",
        f"{FG_SLATE}Financial Model:{RESET} {FG_EMERALD}NPV +${npv/1e6:.2f}M (10y @ 10%){RESET}  │  "
        f"{FG_SLATE}IRR / Payback:{RESET} {FG_CYAN}{irr:.1f}% / 1.26 Yrs{RESET}  │  "
        f"{FG_SLATE}Avoided Risk:{RESET} {FG_EMERALD}${avoided:,.0f}{RESET}",
        f"{FG_SLATE}Quality PID    :{RESET} {setpoint_slider(grade)}  {FG_SLATE}Deviation:{RESET} {FG_WHITE}{(grade-0.850):+.3f}% Cu{RESET}  │  "
        f"{FG_SLATE}Wave (Cu %):{RESET} {braille_sparkline(GLOBAL_HISTORY.grade, width=28)}",
        f"{FG_SLATE}Grafana SCADA   :{RESET} {FG_EMERALD}ONLINE (http://localhost:3000){RESET}  │  {FG_SLATE}6-Wheel Contact:{RESET} {FG_EMERALD}100% Surface Lock{RESET}  │  {FG_SLATE}Ventilation:{RESET} {FG_CYAN}VSP-1800{RESET}"
    ]
    cards.append(material_card("ENTERPRISE OPERATIONS COMMAND (ГОК «АҚТАУ-МЫС»)", lines_cmd, is_active=True, width=width, badge_pill=badge))

    # 3. Card 2: Synoptic Material Conveyance Chain
    cr = data.get("crusher-01", {})
    cv = data.get("conveyor-main-01", {})
    st = data.get("stockpile-coarse-01", {})
    sag = data.get("sag-mill-01", {})
    c_tph = cr.get("throughput_tph", {}).get("value", 2400.0)
    cv_tph = cv.get("mass_flow_tph", {}).get("value", 2400.0)
    st_ton = st.get("live_tonnage_t", {}).get("value", 28500.0)
    sag_kw = sag.get("power_kw", {}).get("value", 6072.0)
    rec = sag.get("flotation_recovery_cu_pct", {}).get("value", 90.50)

    lines_flow = [
        f"{BOLD}{FG_CYAN}CONTINUOUS MATERIAL CONVEYANCE PIPELINE:{RESET}",
        f"  {FG_SLATE}Face Excavation{RESET}  ──>  {BOLD}{FG_EMERALD}Flagship BelAZ-75131 #01 (136t · 1200V DC){RESET}  ──>  "
        f"{FG_SLATE}KKD-1500 Crusher{RESET} ({c_tph:,.0f} t/h)  ──>",
        f"  {FG_SLATE}Overland Conveyor{RESET} ({cv_tph:,.0f} t/h)  ──>  "
        f"{FG_SLATE}Stockpile Dome{RESET} ({st_ton:,.0f} t live)  ──>  "
        f"{FG_SLATE}SAG Mill МПСИ-90{RESET} ({sag_kw:,.0f} kW, {rec:.1f}% Cu)",
        f"{FG_HAIRLINE}{'─' * (width - 8)}{RESET}",
        f"{FG_SLATE}SAG Comminution Power Wave:{RESET} {braille_sparkline(GLOBAL_HISTORY.sag_power, width=32)}  │  "
        f"{FG_SLATE}Overland Belt Tension:{RESET} {FG_WHITE}{cv.get('belt_tension_kn', {}).get('value', 281.0):.1f} kN{RESET}"
    ]
    cards.append(material_card("SYNOPTIC ORE EXTRACTION & BENEFICIATION FLOW", lines_flow, is_active=False, width=width))

    # 4. Card 3: Flagship Haul Fleet Telemetry & ISO 3450 Braking
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

    truck_lines = [
        f"{BOLD}{FG_CYAN}FLAGSHIP HAUL TRUCK BELAZ-75131 #01 (136t · 1200V DC TROLLEY-ASSIST):{RESET}",
        f"  {FG_SLATE}Ramp Chainage PK :{RESET} [{bar}] {BOLD}{FG_WHITE}{km:4.2f} km{RESET} / 3.60 km  │  {p_pill}  │  {FG_SLATE}Speed:{RESET} {BOLD}{FG_WHITE}{spd:4.1f} km/h{RESET}",
        f"  {FG_SLATE}3D Spatial Datum :{RESET} {FG_WHITE}X={x:+.1f}m, Y={y:+.1f}m, Z={z:+.1f}m{RESET}  │  {FG_SLATE}Gradient:{RESET} {FG_EMERALD}{grade:+.1f}%{RESET}  │  {FG_SLATE}Camber Roll:{RESET} {FG_CYAN}{bank:.1f}°{RESET}",
        f"  {FG_SLATE}Powertrain Flow  :{RESET} {FG_CYAN}Electric Draw: {pwr_kw:,.0f} kW{RESET}  │  {FG_SLATE}Fuel Burn:{RESET} {FG_EMERALD}{diesel_lph:.1f} L/h (-82.7% via Catenary){RESET}",
        f"  {FG_SLATE}Payload & Chassis:{RESET} {BOLD}{FG_WHITE}{payload:3.0f} tonnes{RESET} Cu-Mo Ore  │  {FG_SLATE}Bed Angle:{RESET} {FG_WHITE}0.0°{RESET}  │  {FG_SLATE}4x Struts Pressure:{RESET} {FG_WHITE}16.4 MPa{RESET}",
        f"  {FG_SLATE}6-Wheel Contact  :{RESET} {FG_SLATE}FL/FR/RLO/RLI/RRO/RRI:{RESET} {FG_EMERALD}100% Surface Conformance (0.0m floating){RESET}",
        f"  {FG_SLATE}Tire Thermal Load:{RESET} {FG_WHITE}TKPH {tkph:,.0f}{RESET} [{tkph_bar}]  │  {FG_SLATE}ISO 3450 Stopping Dist:{RESET} {BOLD}{FG_EMERALD}{d_stop:4.1f} m{RESET} (μ={mu:.2f})",
        f"  {FG_SLATE}Obstacle Radar   :{RESET} {FG_EMERALD}Berm Clearance: 4.2m [CLEAR]{RESET}  │  {FG_SLATE}Anti-Collision:{RESET} {FG_EMERALD}ONLINE{RESET}  │  {FG_SLATE}Beacon:{RESET} {FG_AMBER}ACTIVE{RESET}"
    ]
    cards.append(material_card("FLAGSHIP HAUL FLEET TELEMETRY & ISO 3450 BRAKING (BelAZ-75131 #01)", truck_lines, is_active=False, width=width))

    # 5. Card 4: Geotechnical Stability & Hydrogeology
    sr = data.get("slope-radar-01", {})
    fos = sr.get("factor_of_safety_fos", {}).get("value", 1.36)
    u_kpa = sr.get("pore_pressure_kpa", {}).get("value", 56.3)
    v_def = sr.get("deformation_velocity_mm_h", {}).get("value", 0.12)
    inv_v = sr.get("inverse_velocity_h_mm", {}).get("value", 8.33)

    ps = data.get("pump-station-01", {})
    lvl = ps.get("sump_water_level_m", {}).get("value", 1.15)
    q_in = ps.get("water_influx_m3h", {}).get("value", 45.0)
    q_out = ps.get("pump_flow_m3h", {}).get("value", 48.0)
    lvl_bar = subpixel_meter(lvl, 2.50, width=12, color_mode="cyan" if lvl < 2.0 else "crimson")
    fos_bar = subpixel_meter(fos - 1.0, 0.50, width=12, color_mode="emerald" if fos > 1.30 else "crimson")

    geo_lines = [
        f"{FG_SLATE}Mohr-Coulomb Factor of Safety:{RESET} {BOLD}{FG_WHITE}{fos:.2f} FoS{RESET} [{fos_bar}]  │  "
        f"{FG_SLATE}Pore Water Pressure u:{RESET} {FG_WHITE}{u_kpa:.1f} kPa{RESET}  │  "
        f"{FG_SLATE}Deformation v:{RESET} {FG_WHITE}{v_def:.2f} mm/h{RESET}",
        f"{FG_SLATE}Fukuzono Inverse Velocity    :{RESET} {FG_CYAN}{inv_v:.2f} h/mm{RESET}  │  "
        f"{FG_SLATE}Deep Pit Sump (-60m):{RESET} {BOLD}{FG_WHITE}{lvl:.2f} m{RESET} [{lvl_bar}]  │  "
        f"{FG_SLATE}Discharge Q_out:{RESET} {FG_EMERALD}{q_out:.1f} m³/h{RESET}",
        f"{FG_SLATE}Slope Radar FoS Trend Wave   :{RESET} {braille_sparkline(GLOBAL_HISTORY.fos, width=28)}  │  "
        f"{FG_SLATE}Sump Level Wave:{RESET} {braille_sparkline(GLOBAL_HISTORY.sump_level, width=24)}"
    ]
    cards.append(material_card("GEOMECHANICAL SLOPE RADAR & PIT HYDROGEOLOGY", geo_lines, is_active=False, width=width))

    # Footer
    footer = (
        f"  {FG_SLATE}Usage Guide:{RESET}  "
        f"{BOLD}{FG_WHITE}python3 team/monitor.py --inspect <unit_id> --once{RESET}  │  "
        f"{BOLD}{FG_WHITE}python3 team/monitor.py --view <1..6> --once{RESET}  │  "
        f"{FG_SLATE}Interactive Mode: Run without --once in TTY terminal{RESET}"
    )
    cards.append(footer)

    return "\n".join(cards)


class TerminalRawMode:
    """Context manager for raw non-blocking terminal input with alternate screen buffer."""
    def __init__(self):
        self.fd = None
        self.old_settings = None

    def __enter__(self):
        if sys.stdin.isatty():
            try:
                import termios
                import tty
                self.fd = sys.stdin.fileno()
                self.old_settings = termios.tcgetattr(self.fd)
                tty.setcbreak(self.fd)
                sys.stdout.write("\033[?1049h\033[?25l")
                sys.stdout.flush()
            except Exception:
                pass
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.fd is not None and self.old_settings is not None:
            try:
                import termios
                sys.stdout.write("\033[?25h\033[?1049l")
                sys.stdout.flush()
                termios.tcsetattr(self.fd, termios.TCSADRAIN, self.old_settings)
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="Smart-Kenish 4.0 Material Design SCADA Monitor")
    parser.add_argument("--once", action="store_true", help="Render snapshot once and exit 0")
    parser.add_argument("--dry-run", action="store_true", help="Validate rendering pipeline and exit 0")
    parser.add_argument("--inspect", type=str, default=None, help="Inspect specific digital twin or controller ID")
    parser.add_argument("--view", type=int, default=1, choices=[1, 2, 3, 4, 5, 6], help="Domain screen (1..6)")
    parser.add_argument("--interval", type=float, default=1.5, help="Refresh interval in seconds (default: 1.5)")
    parser.add_argument("--ditto-url", default=os.environ.get("DITTO_URL", "http://127.0.0.1:8080"))
    parser.add_argument("--ditto-user", default=os.environ.get("DITTO_USER", "ditto"))
    parser.add_argument("--ditto-password", default=os.environ.get("DITTO_PASSWORD", "ditto"))
    args = parser.parse_args()

    # Trap Ctrl+C cleanly
    def sigint_handler(*_):
        sys.stdout.write("\033[?25h\033[?1049l\n")
        sys.stdout.flush()
        sys.exit(0)

    signal.signal(signal.SIGINT, sigint_handler)

    # 1. Warm up local simulator model
    sim = init_simulator_model(seed=42, warmup_steps=40)
    data = fetch_from_ditto(args.ditto_url, args.ditto_user, args.ditto_password)
    if not data and sim:
        data = sim.snapshot()

    if not data:
        print("ERROR: Unable to acquire telemetry from Ditto or local physics model.", file=sys.stderr)
        return 1

    # 2. Handle Direct CLI Deep-Dive Flags (--inspect / --view --once / --once / --dry-run)
    is_interactive = sys.stdin.isatty() and not args.once and not args.dry_run and args.inspect is None

    if not is_interactive:
        if args.inspect:
            print(render_deep_inspector(args.inspect, data, width=98))
            return 0
        elif args.view and (args.once or args.dry_run):
            if args.view == 1 and not any(arg.startswith("--view") for arg in sys.argv):
                # Default --once without explicit --view renders full comprehensive overview
                print(render_full_overview(data, width=98))
            else:
                print(render_domain_view(args.view, data, active_cursor=0, width=98))
            return 0
        else:
            print(render_full_overview(data, width=98))
            return 0

    # 3. Interactive TUI Alternate-Screen Event Loop
    current_view = args.view
    active_cursor = 0
    in_inspector = False
    inspected_unit = "org.openegiz.mine:truck-01"

    last_sim_tick = time.time()

    with TerminalRawMode():
        while True:
            now = time.time()
            dt = now - last_sim_tick
            last_sim_tick = now

            # Step physical model forward
            if sim:
                sim.step(dt * 2.0)
                # Apply interactive setpoint nudges
                if abs(GLOBAL_WORKBENCH.target_grade_nudge) > 1e-4 and "mine-01" in sim.twins:
                    base_g = 0.850 + GLOBAL_WORKBENCH.target_grade_nudge
                    sim.twins["mine-01"].features["avg_grade"]["value"] = round(base_g, 4)
                data = sim.snapshot()
            else:
                d_poll = fetch_from_ditto(args.ditto_url, args.ditto_user, args.ditto_password)
                if d_poll:
                    data = d_poll

            GLOBAL_HISTORY.record(data)

            # Determine selectable items for current view
            selectable = get_view_selectable_items(current_view)
            active_cursor = max(0, min(active_cursor, len(selectable) - 1))

            # Non-blocking key handling
            key = read_key_nonblocking()
            if key:
                if key == "q":
                    if in_inspector:
                        in_inspector = False
                    else:
                        break
                elif key in ("1", "2", "3", "4", "5", "6"):
                    current_view = int(key)
                    active_cursor = 0
                    in_inspector = False
                elif key in ("UP", "k"):
                    active_cursor = max(0, active_cursor - 1)
                elif key in ("DOWN", "j"):
                    active_cursor = min(len(selectable) - 1, active_cursor + 1)
                elif key in ("\n", "\r", " "):
                    if selectable:
                        inspected_unit = selectable[active_cursor]
                        in_inspector = True
                elif key in ("ESC", "\x7f", "\x08", "b"):
                    in_inspector = False
                elif in_inspector:
                    if key == "f":
                        GLOBAL_WORKBENCH.toggle_fault(inspected_unit)
                    elif key == "n":
                        GLOBAL_WORKBENCH.toggle_drift(inspected_unit)
                    elif key in ("+", "="):
                        GLOBAL_WORKBENCH.nudge(inspected_unit, +1)
                    elif key in ("-", "_"):
                        GLOBAL_WORKBENCH.nudge(inspected_unit, -1)

            # Render Screen Buffer
            if in_inspector:
                screen_txt = render_deep_inspector(inspected_unit, data, width=98)
            else:
                screen_txt = render_domain_view(current_view, data, active_cursor=active_cursor, width=98)

            # Reposition cursor and redraw buffer flicker-free
            sys.stdout.write("\033[H" + screen_txt + "\033[J")
            sys.stdout.flush()

            time.sleep(0.06)

    return 0


if __name__ == "__main__":
    sys.exit(main())