#!/usr/bin/env python3
"""
CLI Tool for What-If Scenarios Control (Team-018: Smart-Kenish).
Real-World Industrial Mining Incidents with Historical Probabilities & Financial Loss Metrics.
Based on ICMM, Metso Outotec Reliability Data, and CSIRO Open-Pit Hydrogeology.
"""

import argparse
import json
import os
import socket
import sys

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
CMD_TOPIC = "cmd/scenario/control"

SCENARIOS = {
    "trolley-fault": {
        "title": "Catenary Power Fault & Haul Ramp Obstruction",
        "industry_ref": "ICMM Open-Pit Transport Statistics / Boliden Aitik benchmark",
        "annual_probability": "14.2% annual fault frequency",
        "unmitigated_loss": "$1,850,000 (36h ramp paralysis @ $111,000/h mine downtime rate)",
        "gen1_desc": "Gen-1 (98.6%): Auto-pantograph drop, switch to diesel crawl (12.2 km/h) [Mitigated loss: +$14,200/h fuel penalty]",
        "gen2_desc": "Gen-2 (1.4%): Mechanical pantograph tear at stochastic ramp chainage (s_snag ~ U(250m, 1650m)) & lane blockage -> ZIF Mobile Repair Brigade dispatched with spare shear pin & tow tractor [Mitigated loss: $28,000]",
        "revert_desc": "Undo: Line re-energized, shear pin replaced, resume 24.5 km/h trolley climb ($1.85M loss prevented)",
    },
    "crusher-fault": {
        "title": "Tramp Metal Ingestion in Primary Crusher KKD-1500 (Broken Shovel Tooth)",
        "industry_ref": "Metso Outotec & FLSmidth Reliability Report (Erdenet/Chuquicamata)",
        "annual_probability": "1.2% per 100,000 tonnes crushed (approx 1 tooth event/year)",
        "unmitigated_loss": "$5,400,000 (Catastrophic main shaft fracture + 21 days mill starvation)",
        "gen1_desc": "Gen-1 (97.8%): Metal detector current trip, auto hydraulic relief drops shaft 150mm; haul fleet diverts to buffer stockpile [Mitigated loss: $4,500]",
        "gen2_desc": "Gen-2 (2.2%): Manganese tooth wedges in mantle, shearing relief pin -> Auto-start of Standby Metso LT140 Mobile Crusher (550 t/h) maintains mill feed [Mitigated loss: $38,000]",
        "revert_desc": "Undo: Metal extracted with rock-breaker, pin replaced, KKD-1500 online ($5.4M catastrophe avoided)",
    },
    "water-influx": {
        "title": "Deep Pit Horizon -60m Sub-artesian Aquifer Inrush (Inflow Surge 45 -> 350 m3/h)",
        "industry_ref": "CSIRO & USGS Deep Pit Hydrogeological Hazards Database",
        "annual_probability": "2.1% probability in deepening bench development blasts",
        "unmitigated_loss": "$2,272,000 (Electric Shovel EX-02 drowning, stator destruction, 14d bench lost)",
        "gen1_desc": "Gen-1 (98.2%): Acoustic surge sensor alarms FMS -> EX-02 shovel evacuated to +0m in 18 min; pump WP-01 accelerates to 100% (240 m3/h) [Mitigated loss: $12,000]",
        "gen2_desc": "Gen-2 (1.8%): Inflow surge raises pore pressure u(t) dropping slope FoS < 1.15; suction strainer choked -> Geotechnical interlock alarms, Emergency ATS engages Barge Pontoon Pump WP-02 [Mitigated loss: $62,000]",
        "revert_desc": "Undo: Sump level restored to 1.15m safe datum, FoS restored to 1.34, strainer flushed, EX-02 resumes face mining ($2.272M shovel write-off prevented)",
    },
}


def _raw_mqtt_publish(host, port, topic, payload_str):
    """Publish MQTT 3.1.1 message via raw standard library socket (zero dependencies)."""
    s = None
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        s.connect((host, port))

        # 1. CONNECT packet
        cid = f"cli-{os.getpid()}".encode("ascii")
        vh = b"\x00\x04MQTT\x04\x02\x00\x3c"
        pl = len(cid).to_bytes(2, "big") + cid
        rem_len = len(vh) + len(pl)
        s.sendall(bytes([0x10, rem_len]) + vh + pl)

        connack = b""
        while len(connack) < 4:
            chunk = s.recv(4 - len(connack))
            if not chunk:
                break
            connack += chunk
        if not (len(connack) >= 4 and connack[0] == 0x20 and connack[3] == 0x00):
            return False

        # 2. PUBLISH packet (QoS 0)
        tb = topic.encode("utf-8")
        pb = payload_str.encode("utf-8")
        rem = 2 + len(tb) + len(pb)
        rem_bytes = bytearray()
        x = rem
        while True:
            b = x % 128
            x = x // 128
            if x > 0:
                b |= 128
            rem_bytes.append(b)
            if x == 0:
                break
        hdr = bytes([0x30]) + bytes(rem_bytes) + len(tb).to_bytes(2, "big") + tb
        s.sendall(hdr + pb)

        # 3. DISCONNECT packet
        s.sendall(b"\xe0\x00")
        return True
    except Exception:
        return False
    finally:
        if s:
            try:
                s.close()
            except Exception:
                pass


def send_ditto_command(scenario, action, mode="gen1"):
    """Send scenario contingency command directly into Eclipse Ditto twin feature via REST API."""
    ditto_url = (os.environ.get("DITTO_URL") or "http://localhost:8080").rstrip("/")
    ditto_user = os.environ.get("DITTO_USER") or "ditto"
    ditto_pass = os.environ.get("DITTO_PASSWORD") or "ditto"
    target_state = "NORMAL" if action.lower() == "revert" else mode.upper()
    thing_map = {
        "trolley-fault": "org.openegiz.mine:trolley-line-01",
        "crusher-fault": "org.openegiz.mine:crusher-01",
        "water-influx": "org.openegiz.mine:pump-station-01",
    }
    thing_id = thing_map.get(scenario)
    if not thing_id:
        return False
    try:
        import base64
        import urllib.request
        auth = "Basic " + base64.b64encode(f"{ditto_user}:{ditto_pass}".encode()).decode()
        url = f"{ditto_url}/api/2/things/{thing_id}/features/contingency_status/properties/value"
        req = urllib.request.Request(
            url,
            data=json.dumps(target_state).encode("utf-8"),
            headers={"Authorization": auth, "Content-Type": "application/json"},
            method="PUT",
        )
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False


def send_command(payload):
    """Publish a scenario command to both MQTT and Eclipse Ditto REST API. Returns True if accepted."""
    scenario = payload.get("scenario")
    action = payload.get("action", "trigger")
    mode = payload.get("mode", "gen1")

    # 1. Update Eclipse Ditto Twin feature directly via REST API
    ditto_ok = send_ditto_command(scenario, action, mode)

    payload_str = json.dumps(payload)

    # 2. paho-mqtt (if installed): wait for the QoS 1 PUBACK
    if mqtt:
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"smart-kenish-cli-{os.getpid()}")
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=10)
            client.loop_start()
            info = client.publish(CMD_TOPIC, payload_str, qos=1)
            info.wait_for_publish(timeout=5)
            published = info.is_published()
            client.loop_stop()
            client.disconnect()
            if published or ditto_ok:
                return True
        except Exception as exc:
            pass

    # 3. Zero-dependency raw socket fallback (QoS 0 after a successful CONNACK)
    if _raw_mqtt_publish(MQTT_HOST, MQTT_PORT, CMD_TOPIC, payload_str) or ditto_ok:
        return True

    log_msg = f"Notice: MQTT broker {MQTT_HOST}:{MQTT_PORT} and Ditto currently offline (dry-run safe)"
    if os.environ.get("DEBUG"):
        print(log_msg)
    return False


def interactive_menu():
    """Interactive TUI menu for triggering and reverting What-If scenarios."""
    while True:
        print("\n" + "=" * 80)
        print("  🎮 SMART-KENISH 4.0: INTERACTIVE WHAT-IF SCENARIOS CONTROLLER")
        print("=" * 80)
        print("  [1] ⚡ Trigger Trolley Fault (Gen-1: Auto-pantograph drop, diesel crawl 12.2 km/h)")
        print("  [2] ⚡ Trigger Trolley Fault (Gen-2: Pantograph snag, ramp obstruction & ZIF)")
        print("  [3] ⚙️  Trigger Crusher Jam (Gen-1: Auto-hydraulic relief, stockpile divert)")
        print("  [4] ⚙️  Trigger Crusher Jam (Gen-2: Tooth wedge, auto-start Metso LT140)")
        print("  [5] 🌊 Trigger Water Inrush (Gen-1: 350 m3/h surge, WP-01 100%, EX-02 evac)")
        print("  [6] 🌊 Trigger Water Inrush (Gen-2: Strainer choke, pontoon pump WP-02)")
        print("  [7] 🔄 Revert Trolley Fault -> Normal")
        print("  [8] 🔄 Revert Crusher Jam -> Normal")
        print("  [9] 🔄 Revert Water Inrush -> Normal")
        print("  [0] 🟢 Revert ALL Incidents -> Normal Operation")
        print("  [Q] Exit")
        print("=" * 80)
        try:
            choice = input("Select incident [0-9, Q]: ").strip().upper()
        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break
        if choice in ("Q", "QUIT", "EXIT"):
            break
        elif choice == "1":
            send_command({"scenario": "trolley-fault", "action": "trigger", "mode": "gen1"})
            print("🚨 Triggered trolley-fault (Gen-1)")
        elif choice == "2":
            send_command({"scenario": "trolley-fault", "action": "trigger", "mode": "gen2"})
            print("🚨 Triggered trolley-fault (Gen-2)")
        elif choice == "3":
            send_command({"scenario": "crusher-fault", "action": "trigger", "mode": "gen1"})
            print("🚨 Triggered crusher-fault (Gen-1)")
        elif choice == "4":
            send_command({"scenario": "crusher-fault", "action": "trigger", "mode": "gen2"})
            print("🚨 Triggered crusher-fault (Gen-2)")
        elif choice == "5":
            send_command({"scenario": "water-influx", "action": "trigger", "mode": "gen1"})
            print("🚨 Triggered water-influx (Gen-1)")
        elif choice == "6":
            send_command({"scenario": "water-influx", "action": "trigger", "mode": "gen2"})
            print("🚨 Triggered water-influx (Gen-2)")
        elif choice == "7":
            send_command({"scenario": "trolley-fault", "action": "revert"})
            print("✅ Reverted trolley-fault to NORMAL")
        elif choice == "8":
            send_command({"scenario": "crusher-fault", "action": "revert"})
            print("✅ Reverted crusher-fault to NORMAL")
        elif choice == "9":
            send_command({"scenario": "water-influx", "action": "revert"})
            print("✅ Reverted water-influx to NORMAL")
        elif choice == "0":
            for sc in ("trolley-fault", "crusher-fault", "water-influx"):
                send_command({"scenario": sc, "action": "revert"})
            print("✅ Reverted ALL incidents to NORMAL")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Smart-Kenish Real-World Mining What-If Scenarios Controller")
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    subparsers.add_parser("list", help="List all real-world What-If incidents with historical probabilities and damage metrics")

    trig_p = subparsers.add_parser("trigger", help="Activate a What-If scenario")
    trig_p.add_argument("scenario", choices=list(SCENARIOS.keys()), help="Scenario identifier")
    trig_p.add_argument("pos_mode", nargs="?", choices=["gen1", "gen2", "revert"], default=None,
                        help="Optional positional mode: 'gen1', 'gen2', or 'revert'")
    trig_p.add_argument("--mode", choices=["gen1", "gen2", "revert"], default=None,
                        help="Select 'gen1' (baseline automated response), 'gen2' (compound contingency failure), or 'revert'")
    trig_p.add_argument("--dry-run", action="store_true", help="Print scenario command without publishing to MQTT")

    rev_p = subparsers.add_parser("revert", help="Revert a What-If scenario back to normal operation")
    rev_p.add_argument("scenario", nargs="?", default="all", choices=list(SCENARIOS.keys()) + ["all"],
                       help="Scenario identifier (optional, default: 'all' to revert all active incidents)")
    rev_p.add_argument("--dry-run", action="store_true", help="Print scenario revert without publishing to MQTT")

    subparsers.add_parser("interactive", help="Launch interactive menu for What-If scenario triggers")

    args = parser.parse_args()

    if args.command == "interactive":
        return interactive_menu()

    if args.command == "list" or not args.command:
        print("\n================================================================================")
        print("   SMART-KENISH REAL-WORLD MINING INCIDENT CONTROLLER (WHAT-IF ENGINE 2.0)")
        print("   Historical Probabilities, Unmitigated Losses & Contingency Response Tree")
        print("================================================================================\n")
        for s_id, s in SCENARIOS.items():
            print(f"[{s_id.upper()}] {s['title']}")
            print(f"  🏢 Industry Reference: {s['industry_ref']}")
            print(f"  📊 Statistical Probability: {s['annual_probability']}")
            print(f"  💥 Unmitigated Financial Loss: {s['unmitigated_loss']}")
            print(f"  🛡️  {s['gen1_desc']}")
            print(f"  🚒 {s['gen2_desc']}")
            print(f"  🔄 {s['revert_desc']}")
            print(f"  ▶️  Trigger command:  python3 team/scenarios.py trigger {s_id} [gen1|gen2]")
            print(f"  ⏪ Revert command:   python3 team/scenarios.py revert {s_id}\n")
        print("================================================================================\n")
        return 0

    if args.command == "trigger":
        effective_mode = args.pos_mode or args.mode or "gen1"
        if effective_mode == "revert":
            if getattr(args, "dry_run", False):
                print(f"\n✅ [OFFLINE DRY-RUN REVERTED]: {args.scenario} -> NORMAL")
                print(f"   Resolution: {SCENARIOS[args.scenario]['revert_desc']}")
                return 0
            payload = {"scenario": args.scenario, "action": "revert"}
            if send_command(payload):
                print(f"\n✅ [INCIDENT REVERTED]: {args.scenario} -> NORMAL")
                print(f"   Resolution: {SCENARIOS[args.scenario]['revert_desc']}")
                return 0
            else:
                print(f"Notice: Live stack offline for {args.scenario} (use --dry-run for offline test)")
                return 1

        if getattr(args, "dry_run", False):
            print(f"\n🚨 [OFFLINE DRY-RUN TRIGGERED]: {args.scenario} [{effective_mode.upper()}]")
            mode_desc = SCENARIOS[args.scenario]["gen1_desc"] if effective_mode == "gen1" else SCENARIOS[args.scenario]["gen2_desc"]
            print(f"   Action: {mode_desc}")
            print(f"   Unmitigated Risk: {SCENARIOS[args.scenario]['unmitigated_loss']}")
            return 0

        payload = {"scenario": args.scenario, "action": "trigger", "mode": effective_mode}
        if send_command(payload):
            print(f"\n🚨 [INCIDENT TRIGGERED]: {args.scenario} [{effective_mode.upper()}]")
            mode_desc = SCENARIOS[args.scenario]["gen1_desc"] if effective_mode == "gen1" else SCENARIOS[args.scenario]["gen2_desc"]
            print(f"   Action: {mode_desc}")
            print(f"   Unmitigated Risk: {SCENARIOS[args.scenario]['unmitigated_loss']}")
            return 0
        else:
            print(f"Notice: Live stack offline for {args.scenario} (use --dry-run for offline test)")
            return 1

    if args.command == "revert":
        target_scenarios = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]
        if getattr(args, "dry_run", False):
            for sc in target_scenarios:
                print(f"\n✅ [OFFLINE DRY-RUN REVERTED]: {sc} -> NORMAL")
                print(f"   Resolution: {SCENARIOS[sc]['revert_desc']}")
            return 0

        all_ok = True
        for sc in target_scenarios:
            payload = {"scenario": sc, "action": "revert"}
            if send_command(payload):
                print(f"\n✅ [INCIDENT REVERTED]: {sc} -> NORMAL")
                print(f"   Resolution: {SCENARIOS[sc]['revert_desc']}")
            else:
                print(f"Notice: Live stack offline for {sc} (use --dry-run for offline test)")
                all_ok = False
        return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
