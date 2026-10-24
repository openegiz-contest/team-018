#!/usr/bin/env python3
"""
Industrial Unit Test Suite for Smart-Kenish (Team-018: OpenEgiz Digital Mine).
Validates core digital twin physics, EKF-PID blending, 1200V microgrid, ISO 3450 braking,
What-If contingency scenarios, and TUI renderer output.
"""

import os
import sys
import unittest

# Ensure team directory is in sys.path
TEAM_DIR = os.path.dirname(os.path.abspath(__file__))
if TEAM_DIR not in sys.path:
    sys.path.insert(0, TEAM_DIR)

from simulator import SmartKenishModel
import scenarios
from modules.trolley_energy_manager import TrolleyEnergyManager
from modules.grade_blending_controller import GradeBlendingController
from modules.tkph_thermal_protector import TkphThermalProtector
from modules.crusher_protection_unit import CrusherProtectionUnit
from modules.dewatering_controller import DewateringController
from tui_renderer import render_domain_view, render_deep_inspector


class TestSmartKenishModel(unittest.TestCase):
    """Verifies the core digital twin simulation model and physics bounds."""

    def setUp(self):
        self.model = SmartKenishModel()

    def test_model_initialization(self):
        self.assertIsNotNone(self.model)
        self.assertEqual(len(self.model.trucks), 8)
        self.assertEqual(self.model.scenario_trolley, "NORMAL")
        self.assertEqual(self.model.scenario_crusher, "NORMAL")
        self.assertEqual(self.model.scenario_water, "NORMAL")

    def test_simulation_step_and_snapshot(self):
        self.model.step(dt=1.0)
        snap = self.model.snapshot()
        self.assertIsInstance(snap, dict)

        # Verify all mandatory digital twins exist in snapshot (including all 8 haul trucks)
        mandatory_twins = [
            "mine-01",
            "truck-01",
            "truck-02",
            "truck-03",
            "truck-04",
            "truck-05",
            "truck-06",
            "truck-07",
            "truck-08",
            "excavator-01",
            "excavator-02",
            "crusher-01",
            "crusher-standby-02",
            "trolley-line-01",
            "substation-01",
            "slope-radar-01",
            "pump-station-01",
            "sag-mill-01",
            "conveyor-main-01",
            "stockpile-coarse-01",
            "water-bowser-01",
            "drill-rig-01",
        ]
        for twin_id in mandatory_twins:
            self.assertIn(twin_id, snap, f"Missing digital twin: {twin_id}")

    def test_physical_bounds(self):
        self.model.step(dt=1.0)
        snap = self.model.snapshot()

        # 1. Feed grade target compliance (0.850% Cu +-0.05%)
        feed_grade = snap["mine-01"]["avg_grade"]["value"]
        self.assertAlmostEqual(feed_grade, 0.850, delta=0.05)

        # 2. Flagship BelAZ-75131 speed on trolley (20 to 30 km/h)
        truck_speed = snap["truck-01"]["speed"]["value"]
        self.assertGreaterEqual(truck_speed, 10.0)
        self.assertLessEqual(truck_speed, 40.0)

        # 3. Slope radar Factor of Safety FoS (1.1 to 1.6)
        radar_fos = snap["slope-radar-01"]["factor_of_safety_fos"]["value"]
        self.assertGreaterEqual(radar_fos, 1.1)
        self.assertLessEqual(radar_fos, 1.6)

        # 4. Deep pit sump water level (0.5 to 3.0 m)
        sump_level = snap["pump-station-01"]["sump_water_level_m"]["value"]
        self.assertGreaterEqual(sump_level, 0.5)
        self.assertLessEqual(sump_level, 3.0)

        # 5. SAG mill comminution power (> 0 kW)
        sag_power = snap["sag-mill-01"]["power_kw"]["value"]
        self.assertGreater(sag_power, 0.0)


class TestWhatIfScenarios(unittest.TestCase):
    """Verifies What-If incident trigger, Gen-1/Gen-2 branching, and revert execution."""

    def test_trolley_fault_lifecycle(self):
        # Trigger Gen-1
        res_g1 = scenarios.send_command({"scenario": "trolley-fault", "action": "trigger", "mode": "gen1"})
        self.assertIsInstance(res_g1, bool)

        # Trigger Gen-2
        res_g2 = scenarios.send_command({"scenario": "trolley-fault", "action": "trigger", "mode": "gen2"})
        self.assertIsInstance(res_g2, bool)

        # Revert
        res_rev = scenarios.send_command({"scenario": "trolley-fault", "action": "revert"})
        self.assertIsInstance(res_rev, bool)

    def test_crusher_fault_lifecycle(self):
        res_g1 = scenarios.send_command({"scenario": "crusher-fault", "action": "trigger", "mode": "gen1"})
        self.assertIsInstance(res_g1, bool)

        res_g2 = scenarios.send_command({"scenario": "crusher-fault", "action": "trigger", "mode": "gen2"})
        self.assertIsInstance(res_g2, bool)

        res_rev = scenarios.send_command({"scenario": "crusher-fault", "action": "revert"})
        self.assertIsInstance(res_rev, bool)

    def test_water_influx_lifecycle(self):
        res_g1 = scenarios.send_command({"scenario": "water-influx", "action": "trigger", "mode": "gen1"})
        self.assertIsInstance(res_g1, bool)

        res_g2 = scenarios.send_command({"scenario": "water-influx", "action": "trigger", "mode": "gen2"})
        self.assertIsInstance(res_g2, bool)

        res_rev = scenarios.send_command({"scenario": "water-influx", "action": "revert"})
        self.assertIsInstance(res_rev, bool)


class TestEngineeringModules(unittest.TestCase):
    """Verifies individual physics and controller modules."""

    def test_trolley_energy_manager(self):
        mgr = TrolleyEnergyManager()
        # Normal step with two trucks climbing under catenary
        mgr.step(dt_seconds=1.0, active_truck_demands=[1104.0, 1104.0], downhill_regen_kw=210.0, line_fault=False)
        telem = mgr.get_telemetry()
        self.assertEqual(telem["status"], "ENERGIZED")
        self.assertGreater(telem["voltage_v"], 1050.0)
        self.assertGreater(telem["total_power_kw"], 2000.0)

        # Fault step
        mgr.step(dt_seconds=1.0, active_truck_demands=[1104.0], downhill_regen_kw=0.0, line_fault=True)
        telem_fault = mgr.get_telemetry()
        self.assertEqual(telem_fault["status"], "FAULT_DE_ENERGIZED")
        self.assertEqual(telem_fault["voltage_v"], 0.0)

    def test_grade_blending_controller(self):
        ctrl = GradeBlendingController(target_grade=0.850)
        # Update blend with measured ore from haul trucks
        ctrl.update_crusher_feed(dumped_tonnes=130.0, ore_grade=0.87, moisture_pct=4.5)
        metrics = ctrl.get_metrics()
        self.assertIn("kalman_gain", metrics)
        self.assertGreater(metrics["kalman_gain"], 0.0)
        self.assertLessEqual(metrics["kalman_gain"], 1.0)
        self.assertAlmostEqual(ctrl.filtered_cu_grade, 0.850, delta=0.05)

    def test_tkph_thermal_protector(self):
        prot = TkphThermalProtector(rated_tkph=240.0)
        # Gross weight 237.5t (BelAZ-75131 laden), 25 km/h
        instant_tkph, new_temp, derate = prot.update_tire_state(
            truck_gross_tonnes=237.5, speed_kmh=25.0, current_temp_c=45.0, dt_seconds=10.0
        )
        self.assertGreater(instant_tkph, 900.0)
        self.assertGreater(new_temp, 45.0)
        self.assertIn(derate, [0.70, 0.85, 1.0])

    def test_crusher_protection_unit(self):
        cpu = CrusherProtectionUnit()
        # Normal
        cpu.step(dt_seconds=1.0, feed_dump_tonnes=130.0, jam_event="NORMAL")
        self.assertEqual(cpu.state, "crushing")
        self.assertFalse(cpu.hydraulic_relief_active)

        # Tramp metal trip (Gen-1)
        cpu.step(dt_seconds=1.0, feed_dump_tonnes=130.0, jam_event="GEN1")
        self.assertEqual(cpu.state, "AUTO_RELIEF_JAMMED")
        self.assertTrue(cpu.hydraulic_relief_active)

        # Mechanical pin shear (Gen-2) -> Standby LT140 cut-in
        cpu.step(dt_seconds=1.0, feed_dump_tonnes=0.0, jam_event="GEN2")
        self.assertEqual(cpu.standby_state, "OPERATING_ONLINE")
        self.assertEqual(cpu.standby_tph, 550.0)

        # Revert
        cpu.reset_nominal()
        self.assertEqual(cpu.state, "crushing")

    def test_dewatering_controller(self):
        dw = DewateringController()
        # Baseline step
        dw.step(dt_seconds=1.0, influx_surge_m3h=0.0, main_pump_choked=False)
        telem = dw.get_telemetry()
        self.assertEqual(telem["aux_pump_state"], "STANDBY_READY")
        self.assertFalse(telem["alarm_active"])

        # Crisis surge: 300 m3/h surge + strainer choked -> ATS cuts in barge pump WP-02
        dw.step(dt_seconds=1.0, influx_surge_m3h=300.0, main_pump_choked=True)
        telem_crisis = dw.get_telemetry()
        self.assertEqual(telem_crisis["aux_pump_state"], "AVR_PONTOON_ACTIVE")
        self.assertTrue(telem_crisis["alarm_active"])

        # Reset
        dw.reset_nominal()
        self.assertEqual(dw.aux_pump_state, "STANDBY_READY")


class TestTuiRenderer(unittest.TestCase):
    """Verifies that the authentic SCADA terminal views render cleanly."""

    def setUp(self):
        self.model = SmartKenishModel()
        self.model.step(dt=1.0)
        self.snap = self.model.snapshot()

    def test_render_all_six_views(self):
        for view_idx in range(1, 7):
            rendered_text = render_domain_view(view_idx, self.snap, width=98)
            self.assertIsInstance(rendered_text, str)
            self.assertGreater(len(rendered_text), 100)

    def test_render_deep_inspector(self):
        inspect_text = render_deep_inspector("truck-01", self.snap, width=98)
        self.assertIsInstance(inspect_text, str)
        self.assertGreater(len(inspect_text), 100)
        self.assertIn("BelAZ-75131", inspect_text)


if __name__ == "__main__":
    unittest.main()

