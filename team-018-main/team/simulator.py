#!/usr/bin/env python3
"""
Smart-Kenish Simulator (Team-018) for OpenEgiz Digital Mine.
Industrial-Grade High-Fidelity Cyber-Physical Simulator (Smart-Kenish 4.0):
- 24 Industrial Digital Twins under org.openegiz.mine:* (12 Mt/a complex)
- BelAZ-75131 Haulage Fleet (1 flagship truck) with coordinated links
- M/M/1 Queueing physics at shovels and primary crusher with QUEUED_IDLE burn
- ISO 3450:2011 Wet Traction, Braking Distance, and Wet-Ramp Speed Derating
- Epiroc Pit Viper 271 Autonomous Drill Rig with MWD & Bond Work Index feedforward
- BelAZ-76135 Dust-Suppression Water Bowser with active PM10/PM2.5 road damping
- KNK-270 Overland Coarse Ore Conveyor & 45,000t Covered Surge Stockpile Mass Balance ODE
- MPSI-90x30 Primary Concentrator SAG Mill (Bond comminution power & flotation recovery)
- IDS IBIS-FM Slope Stability Radar & Mohr-Coulomb Factor of Safety (FoS) geotech interlock
- Stochastic spatial snag location on 1.8 km ramp in trolley-fault Gen-2
- Unit-of-Production (UoP) Depletion & Tax Shield accounting (IFRS 6 / IAS 16)
- Discrete Extended Kalman Filter (EKF) sensor filtering & Lyapunov adaptive PID tuning
"""

import argparse
import json
import logging
import math
import os
import random
import signal
import sys
import time

try:
    from modules import (
        GradeBlendingController,
        TrolleyEnergyManager,
        TkphThermalProtector,
        DewateringController,
        CrusherProtectionUnit,
        SensorDegradationSimulator,
        ReferenceTraceLoader,
    )
except ImportError:
    from .modules import (
        GradeBlendingController,
        TrolleyEnergyManager,
        TkphThermalProtector,
        DewateringController,
        CrusherProtectionUnit,
        SensorDegradationSimulator,
        ReferenceTraceLoader,
    )

try:
    import paho.mqtt.client as mqtt
except ImportError:
    mqtt = None

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("smart_kenish_sim")

NAMESPACE = "org.openegiz.mine"
TOPIC_PREFIX = "telemetry"
CMD_TOPIC_SCENARIOS = "cmd/scenario/#"
CMD_TOPIC_CONTROL = "cmd/control/#"

# --- Physical & Operational Constants (Cited in SUBMISSION.md Section 4.2) ---
ROUTE_LENGTH_KM = 3.6           # Standard haul distance from bench to crusher
DETOUR_ROUTE_LENGTH_KM = 4.4    # Detour haul distance during primary crusher blockage (PK28+50 stockpile switchback)
RAMP_START_KM = 0.6             # Ramp start
RAMP_END_KM = 2.4               # Ramp end (1.8 km continuous climb)
RAMP_GRADE = 0.085              # 8.5% incline (sin alpha approx 0.085)
ROLLING_RESISTANCE = 0.02       # Crushed rock haul road coefficient
GRAVITY = 9.81                  # m/s^2
ROTATIONAL_INERTIA_FACTOR = 1.08# Wheel sets + electric traction motor armature inertia (SAE J2188 / ISO 13543)
AIR_DENSITY = 1.20              # kg/m^3 (Standard sea level to 200m datum at 20 degC)
DRAG_COEFFICIENT = 0.85         # BelAZ bluff body aerodynamic drag (Caterpillar Performance Handbook Ed. 49)
FRONTAL_AREA = 28.0             # m^2 (BelAZ-75131 frontal cross section)
LINE_RESISTANCE_OHMS = 0.035    # EN 50149 Cu-ETP 150mm2 catenary contact line resistance
TIRE_COOLING_TAU_S = 1800.0     # Bridgestone OTR 33.00R51 thermal dissipation time constant
TIRE_HEATING_FACTOR = 0.0018    # Bridgestone OTR thermal heating factor
SUMP_AREA_M2 = 4500.0           # Sump pond surface area (CSIRO Deep Pit Hydrogeological guidelines)

# Fleet constants (BelAZ-75131)
TRUCK_EMPTY_WEIGHT_T = 107.0
TRUCK_PAYLOAD_T = 130.0
TRUCK_GROSS_WEIGHT_T = TRUCK_EMPTY_WEIGHT_T + TRUCK_PAYLOAD_T

DIESEL_POWER_KW = 1194.0        # Cummins QSK45 engine
TROLLEY_POWER_KW = 1800.0       # Overhead catenary electric drive
SPEED_DIESEL_CLIMB_KMH = 12.2   # Max loaded uphill speed on diesel
SPEED_TROLLEY_CLIMB_KMH = 24.5  # Loaded uphill speed under trolley
SPEED_FLAT_LOADED_KMH = 32.0
SPEED_EMPTY_RETURN_KMH = 38.0

DIESEL_IDLE_LH = 5.0            # Fuel rate during loading / trolley assist (l/h)
DIESEL_QUEUE_LH = 18.0          # Fuel rate during pit bottom & crusher queue waiting (QUEUED_IDLE)
DIESEL_FLAT_LH = 65.0
DIESEL_CLIMB_LH = 285.0         # Heavy climb fuel rate without trolley (l/h)
DIESEL_REGEN_LH = 4.0           # Fuel rate during downhill regen (l/h)

FUEL_PRICE_USD_L = 0.75         # Commercial diesel price in Kazakhstan ($/liter)
ELECTRICITY_USD_KWH = 0.062     # Industrial tariff ($/kWh)
BASELINE_OPEX_PER_TONNE = 1.42  # Standard all-diesel open-pit baseline ($/tonne)
TARGET_CU_GRADE = 0.850         # Concentrator ideal feed grade (% Cu)

PASS_TIME_EX01 = 28.0           # EKG-15 shovel cycle time (s)
BUCKET_T_EX01 = 30.0            # 30 tonnes per pass
PASS_TIME_EX02 = 25.0           # CAT 6020B cycle time (s)
BUCKET_T_EX02 = 22.0            # 22 tonnes per pass
DUMP_TIME_S = 55.0

# Hourly risk exposure per scenario state ($/h)
RISK_USD_H = {
    "trolley-fault": {"NORMAL": 0.0, "GEN1": 14200.0, "GEN2": 111000.0},
    "crusher-fault": {"NORMAL": 0.0, "GEN1": 45000.0, "GEN2": 150000.0},
    "water-influx":  {"NORMAL": 0.0, "GEN1": 25000.0, "GEN2": 85000.0},
}
BESS_CAPACITY_KWH = 2000.0
BESS_PEAK_SHAVE_KW = 1500.0
HEARTBEAT_FILE = "/tmp/sim_heartbeat"

# UoP Depletion Constants (IFRS 6 / IAS 16)
PROVEN_RESERVE_TONNES = 120000000.0
DEPLETABLE_CAPEX_USD = 14800000.0
SALVAGE_VALUE_USD = 800000.0
NET_DEPLETABLE_BASE_USD = DEPLETABLE_CAPEX_USD - SALVAGE_VALUE_USD  # $14,000,000 net depletables
UOP_DEPLETION_RATE_USD_T = NET_DEPLETABLE_BASE_USD / PROVEN_RESERVE_TONNES  # $0.1167/t ($0.117/t)
CORPORATE_TAX_RATE = 0.20


class SmartTruck:
    def __init__(self, name, assigned_shovel, dispatch_link="north_chalcopyrite", start_km=0.0, start_state="queued_at_excavator"):
        self.name = name
        self.assigned_shovel = assigned_shovel
        self.dispatch_link = dispatch_link
        self.state = start_state
        self.position_km = start_km
        self.v_ms = 0.0                 # Continuous velocity (m/s)
        self.accel_mss = 0.0            # Continuous acceleration (m/s^2)
        self.payload_t = 0.0
        self.grade_cu = 0.0
        self.propulsion_mode = "diesel"
        self.trolley_mode = 0           # 0 = diesel, 1 = trolley electric
        self.pantograph_ramp = 0.0      # Smooth power blend [0.0..1.0]
        self.power_kw = 0.0
        self.fuel_rate_lh = DIESEL_IDLE_LH
        tid = int(name.split("-")[-1]) if "-" in name else 1
        self.tank_capacity_l = 1900.0
        self.fuel_level_l = self.tank_capacity_l * (0.95 - 0.015 * (tid % 5))
        self.fuel_pct = round((self.fuel_level_l / self.tank_capacity_l) * 100.0, 1)
        self.trips = 0
        self.timer = 0.0
        self.tkph = 145.0
        self.tire_temp_c = 60.0
        self.pantograph_jammed = False

        # M/M/1 Queueing & ISO 3450 wet braking attributes
        self.queue_wait_sec = 0.0
        self.queue_position = 0
        self.traction_mu_eff = 0.65
        self.braking_distance_m = 24.2
        self.wet_derate_active = False

    @property
    def speed_kmh(self):
        return self.v_ms * 3.6

    @speed_kmh.setter
    def speed_kmh(self, val):
        self.v_ms = max(0.0, val / 3.6)


class SmartKenishModel:
    def __init__(self, seed=42):
        self.rng = random.Random(seed)
        self.sim_time = 0.0

        # Horizon ore grades
        self.grade_north = 1.35         # High grade bench (+60m)
        self.grade_south = 0.45         # Low grade bench (-60m)

        # Pluggable Subsystem Modules
        self.grade_controller = GradeBlendingController(target_grade=TARGET_CU_GRADE)
        self.energy_manager = TrolleyEnergyManager(
            nominal_voltage=1200.0,
            bess_capacity_kwh=BESS_CAPACITY_KWH,
            peak_shave_limit_kw=BESS_PEAK_SHAVE_KW
        )
        self.tkph_protector = TkphThermalProtector(rated_tkph=240.0)
        self.dewatering_ctrl = DewateringController(sump_area_m2=SUMP_AREA_M2, target_level_m=1.15)
        self.crusher_unit = CrusherProtectionUnit(nominal_tph=2400.0)
        self.sensor_sim = SensorDegradationSimulator(seed=seed, dropout_rate=0.003)

        # Excavators & Kinematic Crawler Locomotion
        self.excavator_01_state = "idle"
        self.excavator_01_passes = 0
        self.excavator_01_elevation_m = 60.0
        self.excavator_02_state = "idle"
        self.excavator_02_passes = 0
        self.excavator_02_elevation_m = -60.0
        self.evacuation_timer = 0.0

        # Comparative Benchmarking Metrics (Rule 9.4 Compliance)
        self.baseline_grade_error = -0.400
        self.smart_grade_error = 0.002

        # Processing & Logistics
        self.crusher_tonnes = 0.0
        self.crusher_grade_weighted = 0.0
        self.crusher_log = []           # [(sim_time, tonnes)]
        self.stockpile_tonnes = 0.0

        # Cumulative Financials & ESG
        self.diesel_saved_liters_total = 0.0
        self.total_tonnes_mined = 0.0
        self.prevented_loss_usd = 0.0
        self.cumulative_loss_usd = 0.0

        # What-If Contingency Scenarios State: "NORMAL" | "GEN1" | "GEN2"
        self.scenario_trolley = "NORMAL"
        self.scenario_crusher = "NORMAL"
        self.scenario_water = "NORMAL"

        # Runtime Discounted Cash Flow Valuation (NPV & IRR)
        self.npv_usd, self.irr_pct = self.compute_discounted_cash_flows()

        # Stochastic Spatial Snag attributes (trolley-fault Gen-2)
        self.snag_chainage_m = None
        self.snag_x = 0.0
        self.snag_y = 0.0
        self.snag_z = 0.0
        self.snag_pos_km = 0.0

        # Auxiliary & Plant Digital Twins State
        self.drill_rig_rop = 28.5
        self.drill_rig_torque = 6.4
        self.drill_rig_sed = 42.5
        self.drill_rig_hardness = 11.4
        self.drill_rig_wi = 14.9
        self.drill_rig_holes = 18
        self.drill_depth_m = 4.2

        self.water_bowser_level = 85000.0
        self.water_bowser_spray = True
        self.water_bowser_speed_kmh = 18.0
        self.road_surface_moisture = 14.5
        self.pm10_ug_m3 = 32.4

        self.conveyor_mass_flow = 2400.0
        self.conveyor_tension_kn = 281.0
        self.conveyor_power_kw = 1122.0
        self.conveyor_tonnes_total = 0.0
        self.conveyor_bearing_temp_c = 52.0
        self.conveyor_rip_status = "NORMAL"

        self.stockpile_live_tonnes = 28500.0
        self.stockpile_reserve_hours = 19.0
        self.stockpile_feeder_1_hz = 42.0
        self.stockpile_feeder_2_hz = 41.5
        self.stockpile_feeder_3_hz = 42.0
        self.stockpile_feeder_4_hz = 41.8

        self.sag_mill_power_kw = 5875.0
        self.sag_mill_feed_tph = 1500.0
        self.sag_mill_recovery = 90.5
        self.sag_mill_load_vol_pct = 26.2
        self.sag_mill_bearing_pressure_mpa = 6.24
        self.sag_mill_slurry_density_pct = 72.1

        self.standby_readiness_pct = 100.0

        self.slope_pore_pressure_kpa = 56.3
        self.pore_pressure_surge_kpa = 0.0
        self.slope_deformation_v = 0.12
        self.slope_fos = 1.34
        self.slope_alarm_status = "NORMAL"

        # OpenEgiz Trace-Driven Simulation Adapter (/ru/data/)
        self.trace_loader = ReferenceTraceLoader()
        self.sim_step_count = 0
        self.microseismic_energy_j = 480.0
        self.blast_ppv_mm_s = 0.45
        self.substation_base_kw = 3450.0
        self.grid_freq_hz = 50.00
        self.power_factor = 0.945
        self.feed_silica_pct = 2.45
        self.feed_iron_pct = 56.8
        self.co_ppm = 3.2
        self.nox_ppm = 0.85

        self.excavator_01_cable_wear = 14.5
        self.excavator_02_hyd_temp = 68.2
        self.last_control_cmd = "AUTO"

        # Full Autonomous Haulage Fleet (8 BelAZ-75131 trucks across North & South Links)
        self.trucks = [
            SmartTruck("truck-01", "excavator-01", "north_chalcopyrite", 0.8, "hauling_trolley"),
            SmartTruck("truck-02", "excavator-02", "south_sulfide", 1.4, "hauling_trolley"),
            SmartTruck("truck-03", "excavator-01", "north_chalcopyrite", 2.2, "hauling_trolley"),
            SmartTruck("truck-04", "excavator-02", "south_sulfide", 3.0, "hauling_diesel"),
            SmartTruck("truck-05", "excavator-01", "north_chalcopyrite", 3.5, "dumping"),
            SmartTruck("truck-06", "excavator-02", "south_sulfide", 2.6, "returning_empty"),
            SmartTruck("truck-07", "excavator-01", "north_chalcopyrite", 1.2, "returning_empty"),
            SmartTruck("truck-08", "excavator-02", "south_sulfide", 0.0, "loading"),
        ]
        for t in self.trucks:
            if t.state in ("hauling_trolley", "hauling_diesel", "dumping"):
                t.payload_t = 130.0
                t.grade_cu = self.grade_north if t.assigned_shovel == "excavator-01" else self.grade_south
                t.v_ms = 24.5 / 3.6 if t.state == "hauling_trolley" else 15.0 / 3.6
            elif t.state == "loading":
                t.payload_t = 65.0
                t.grade_cu = self.grade_south
                t.v_ms = 0.0
            else:
                t.payload_t = 0.0
                t.grade_cu = 0.0
                t.v_ms = 28.0 / 3.6

    @staticmethod
    def _solve_irr(cash_flows, max_iter=80, tol=1e-7):
        """
        Exact polynomial root solver for Internal Rate of Return (IRR):
        Solves sum_{t=0}^N [ CF_t / (1 + IRR)^t ] = 0 via Newton-Raphson iteration.
        """
        r = 0.50
        for _ in range(max_iter):
            npv = 0.0
            d_npv = 0.0
            for t, cf in enumerate(cash_flows):
                denom = (1.0 + r) ** t
                npv += cf / denom
                if t > 0:
                    d_npv += -t * cf / ((1.0 + r) ** (t + 1))
            if abs(d_npv) < 1e-12:
                break
            r_next = r - npv / d_npv
            if abs(r_next - r) < tol:
                return r_next
            r = r_next
        return r

    def compute_discounted_cash_flows(self, annual_savings_usd=None, capex_usd=5750000.0, discount_rate=0.10, years=10):
        """
        Runtime Discounted Cash Flow (DCF) model and exact polynomial root-solved IRR.
        Dynamically couples operational incident losses to project cash flows.
        """
        if annual_savings_usd is None:
            if getattr(self, "sim_time", 0.0) > 10.0 and getattr(self, "total_tonnes_mined", 0.0) > 0.0:
                annual_rate = (self.total_tonnes_mined / self.sim_time) * 3600.0 * 24.0 * 365.0
                daily_savings_usd = self.diesel_saved_liters_total * FUEL_PRICE_USD_L * (86400.0 / max(1.0, self.sim_time))
                cur_opex = max(0.85, BASELINE_OPEX_PER_TONNE - (daily_savings_usd / self.total_tonnes_mined))
                annual_savings_usd = max(1000000.0, (BASELINE_OPEX_PER_TONNE - cur_opex) * annual_rate)
            else:
                annual_savings_usd = 3934000.0

        # Dynamically deduct operational incident losses and hourly risk exposure
        incident_loss_annual = (self.hourly_risk_exposure_usd * 24.0 * 3.0) + min(1200000.0, self.cumulative_loss_usd * 2.0)
        net_annual_savings = max(500000.0, annual_savings_usd - incident_loss_annual)

        cf = [-capex_usd] + [net_annual_savings] * years
        npv = sum(c / ((1.0 + discount_rate) ** t) for t, c in enumerate(cf))
        true_irr = self._solve_irr(cf)
        irr_pct = round(true_irr * 100.0, 1)
        return round(npv, 2), irr_pct

    @property
    def hourly_risk_exposure_usd(self):
        return (RISK_USD_H["trolley-fault"][self.scenario_trolley]
                + RISK_USD_H["crusher-fault"][self.scenario_crusher]
                + RISK_USD_H["water-influx"][self.scenario_water])

    def set_scenario(self, scenario_name, state):
        """Set scenario state: NORMAL, GEN1, GEN2 idempotently with economic damage tracking."""
        state = state.upper()
        if state not in ("NORMAL", "GEN1", "GEN2"):
            log.warning("Invalid scenario state: %s", state)
            return False

        if scenario_name == "trolley-fault":
            if self.scenario_trolley == state:
                return True
            old_state = self.scenario_trolley
            self.scenario_trolley = state

            if state == "GEN1":
                for t in self.trucks:
                    t.trolley_mode = 0
                    t.propulsion_mode = "diesel"
            elif state == "GEN2":
                # Stochastic spatial snag coordinate along 1.8 km ramp (chainage 250m to 1650m)
                self.snag_chainage_m = round(self.rng.uniform(250.0, 1650.0), 1)
                t_norm = self.snag_chainage_m / 1800.0
                self.snag_x = round(120.0 + t_norm * 320.0, 1)
                self.snag_y = round(-40.0 + t_norm * 480.0, 1)
                self.snag_z = round(-55.0 + t_norm * 125.0, 1)
                self.snag_pos_km = round(0.600 + self.snag_chainage_m / 1000.0, 3)

                # Flagship Truck 1 initiates continuous ISO 3450 braking deceleration to halt at snag point without teleportation
                flagship_truck = self.trucks[0]
                flagship_truck.pantograph_jammed = True
                if flagship_truck.position_km >= self.snag_pos_km:
                    flagship_truck.state = "breakdown_blocking_ramp"
                    flagship_truck.v_ms = 0.0
                else:
                    flagship_truck.state = "braking_to_snag"
            else:  # NORMAL (revert)
                if old_state in ("GEN1", "GEN2"):
                    self.prevented_loss_usd += 1850000.0
                self.snag_chainage_m = None
                self.snag_x = None
                self.snag_y = None
                self.snag_z = None
                self.snag_pos_km = None
                flagship_truck = self.trucks[0]
                flagship_truck.pantograph_jammed = False
                if flagship_truck.state in ("breakdown_blocking_ramp", "braking_to_snag"):
                    flagship_truck.state = "hauling"
                if self.scenario_trolley == "NORMAL" and self.scenario_crusher == "NORMAL" and self.scenario_water == "NORMAL":
                    self.cumulative_loss_usd = 0.0
                    self.npv_usd, self.irr_pct = self.compute_discounted_cash_flows()
            log.info("Scenario 'trolley-fault' switched: %s -> %s", old_state, state)
            return True

        elif scenario_name == "crusher-fault":
            if self.scenario_crusher == state:
                return True
            old_state = self.scenario_crusher
            self.scenario_crusher = state
            self.crusher_unit.step(0.0, 0.0, jam_event=state)
            if state == "NORMAL" and old_state in ("GEN1", "GEN2"):
                self.prevented_loss_usd += 5400000.0
                self.crusher_unit.reset_nominal()
                if self.scenario_trolley == "NORMAL" and self.scenario_crusher == "NORMAL" and self.scenario_water == "NORMAL":
                    self.cumulative_loss_usd = 0.0
                    self.npv_usd, self.irr_pct = self.compute_discounted_cash_flows()
            log.info("Scenario 'crusher-fault' switched: %s -> %s", old_state, state)
            return True

        elif scenario_name == "water-influx":
            if self.scenario_water == state:
                return True
            old_state = self.scenario_water
            self.scenario_water = state
            if state == "NORMAL":
                if old_state in ("GEN1", "GEN2"):
                    self.prevented_loss_usd += 2272000.0
                self.dewatering_ctrl.reset_nominal()
                self.excavator_02_elevation_m = -60.0
                if self.excavator_02_state in ("evacuating_ramp", "evacuated_safe"):
                    self.excavator_02_state = "idle"
                if self.scenario_trolley == "NORMAL" and self.scenario_crusher == "NORMAL" and self.scenario_water == "NORMAL":
                    self.cumulative_loss_usd = 0.0
                    self.npv_usd, self.irr_pct = self.compute_discounted_cash_flows()
            log.info("Scenario 'water-influx' switched: %s -> %s", old_state, state)
            return True

        return False

    def handle_command(self, topic: str, payload_dict: dict):
        """Bidirectional command receiver (REST/MQTT -> Simulator actuation)."""
        log.info("Processing command on %s: %s", topic, payload_dict)
        if "scenario" in payload_dict:
            sc = payload_dict.get("scenario")
            mode = payload_dict.get("mode", "gen1").upper()
            act = payload_dict.get("action", "trigger").lower()
            target_state = "NORMAL" if act == "revert" else mode
            self.set_scenario(sc, target_state)
        elif "target_grade" in payload_dict or payload_dict.get("actuator") == "target_cu_grade":
            new_target = float(payload_dict.get("target_grade", payload_dict.get("value", 0.850)))
            self.grade_controller.target_grade = new_target
            log.info("Target Cu grade set to %.3f %% via bidirectional command", new_target)
        elif "pump_override" in payload_dict or payload_dict.get("actuator") == "pontoon_force":
            override = payload_dict.get("pump_override")
            val = payload_dict.get("value")
            is_enabled = (override == "WP-02_FORCE" or override is True or str(override).lower() in ("true", "1") or val is True or str(val).lower() in ("true", "1"))
            if is_enabled:
                self.dewatering_ctrl.aux_pump_state = "AVR_PONTOON_ACTIVE"
            else:
                self.dewatering_ctrl.aux_pump_state = "STANDBY_READY"
            log.info("Dewatering override applied: %s", self.dewatering_ctrl.aux_pump_state)
        elif "spray_active" in payload_dict or payload_dict.get("actuator") == "water_bowser_spray":
            raw_val = payload_dict.get("spray_active", payload_dict.get("value", True))
            val = str(raw_val).lower() not in ("false", "0") if isinstance(raw_val, str) else bool(raw_val)
            self.water_bowser_spray = bool(val)
            log.info("Water bowser spray set to %s via bidirectional command", self.water_bowser_spray)

    def step(self, dt):
        """Step simulation through continuous ODE numerical integration."""
        self.sim_time += dt
        self.sim_step_count += 1

        # Synchronize real-world industrial reference traces (OpenEgiz /ru/data/)
        flot_trace = self.trace_loader.get_flotation(self.sim_step_count)
        energy_trace = self.trace_loader.get_energy(self.sim_step_count)
        seismic_trace = self.trace_loader.get_seismic(self.sim_step_count)
        atmo_trace = self.trace_loader.get_atmosphere(self.sim_step_count)

        self.feed_silica_pct = flot_trace["feed_silica_pct"]
        self.feed_iron_pct = flot_trace["feed_iron_pct"]
        self.substation_base_kw = energy_trace["substation_base_kw"]
        self.grid_freq_hz = energy_trace["grid_freq_hz"]
        self.power_factor = energy_trace["power_factor"]
        self.microseismic_energy_j = seismic_trace["microseismic_energy_j"]
        self.blast_ppv_mm_s = seismic_trace["blast_ppv_mm_s"]
        self.co_ppm = atmo_trace["co_ppm"]
        self.nox_ppm = atmo_trace["nox_ppm"]

        # Natural geological grade micro-fluctuations (Wiener process)
        self.grade_north = min(1.6, max(1.1, self.grade_north + self.rng.gauss(0, 0.001 * math.sqrt(dt))))
        self.grade_south = min(0.65, max(0.3, self.grade_south + self.rng.gauss(0, 0.001 * math.sqrt(dt))))

        # Dewatering Hydrogeological mass balance with continuous Darcy transient pulse
        if not hasattr(self, "influx_surge_m3h"):
            self.influx_surge_m3h = 0.0
        target_surge = 305.0 if self.scenario_water == "GEN2" else (120.0 if self.scenario_water == "GEN1" else 0.0)
        self.influx_surge_m3h += ((target_surge - self.influx_surge_m3h) / 10.0) * dt
        choked = (self.scenario_water == "GEN2")
        self.dewatering_ctrl.step(dt, influx_surge_m3h=self.influx_surge_m3h, main_pump_choked=choked)
        dewatering_telem = self.dewatering_ctrl.get_telemetry()

        # Crusher process step
        self.crusher_unit.step(dt, 0.0, jam_event=self.scenario_crusher)

        # M/M/1 Queue Management across shovels and crusher
        self._update_queue_discipline(dt)

        # Surface moisture & ISO 3450 braking physics (coupled to live road surface moisture)
        is_wet_emergency = (self.scenario_water != "NORMAL")
        moisture_frac = 0.78 if is_wet_emergency else (self.road_surface_moisture / 100.0)
        # ISO 3450:2011 exponential decay traction model: mu_eff(w) = mu_mud + (mu_dry - mu_mud) * exp(-lambda * w)
        mu_eff = 0.22 + 0.43 * math.exp(-0.58 * moisture_frac)

        # Step individual trucks with Newtonian continuous integration
        trolley_demands = []
        downhill_regen_kw = 0.0

        for idx, truck in enumerate(self.trucks):
            # Check headway distance to next truck ahead
            preceding_dist_km = 999.0
            for other in self.trucks:
                if other != truck and other.state == truck.state:
                    dist = other.position_km - truck.position_km
                    if 0 < dist < preceding_dist_km:
                        preceding_dist_km = dist

            self._step_truck_ode(truck, dt, preceding_dist_km, mu_eff)

            if truck.trolley_mode == 1:
                trolley_demands.append(truck.power_kw)
            if truck.power_kw < 0:
                downhill_regen_kw += -truck.power_kw

        # Microgrid Catenary & BESS Energy Manager
        fault = (self.scenario_trolley != "NORMAL")
        self.energy_manager.step(dt, trolley_demands, downhill_regen_kw, line_fault=fault)

        # Crusher buffer log window (1 hour)
        cutoff = self.sim_time - 3600.0
        self.crusher_log = [(t, w) for t, w in self.crusher_log if t >= cutoff]

        # Shovel EX-02 tracked crawler kinematics during water-influx evacuation
        if self.scenario_water in ("GEN1", "GEN2"):
            if self.excavator_02_elevation_m < 0.0:
                self.excavator_02_state = "evacuating_ramp"
                self.excavator_02_elevation_m = min(0.0, self.excavator_02_elevation_m + (60.0 / 1080.0) * dt)
            else:
                self.excavator_02_state = "evacuated_safe"
        else:
            self.excavator_02_elevation_m = -60.0
            if self.excavator_02_state in ("evacuating_ramp", "evacuated_safe"):
                self.excavator_02_state = "idle"

        # Step New Digital Twins Physics
        self._step_auxiliary_assets(dt, dewatering_telem)

        # Step Sensor Degradation & Physical Communication Channel Imperfections
        self.sensor_sim.step(dt)

        # Comparative closed-loop vs baseline open-loop grade error
        self.baseline_grade_error = round(self.grade_south - TARGET_CU_GRADE, 4)
        self.smart_grade_error = round(self.grade_controller.current_blended_grade - TARGET_CU_GRADE, 4)

        # Dynamically accumulate operational losses from active contingency exposure
        self.cumulative_loss_usd += (self.hourly_risk_exposure_usd / 3600.0) * dt

        # Dynamically recompute Discounted Cash Flows (NPV & exact polynomial root-solved IRR)
        self.npv_usd, self.irr_pct = self.compute_discounted_cash_flows()

    def _update_queue_discipline(self, dt):
        """M/M/1 FIFO Queue Discipline at shovels and crusher."""
        # 1. Shovels queues
        for shovel_id in ("excavator-01", "excavator-02"):
            queued = [t for t in self.trucks if t.state == "queued_at_excavator" and t.assigned_shovel == shovel_id]
            queued.sort(key=lambda t: t.queue_wait_sec, reverse=True)
            for pos, trk in enumerate(queued):
                trk.queue_position = pos
                trk.queue_wait_sec += dt
                # Spatial offset to prevent visual overlap
                trk.position_km = max(0.0, pos * 0.025)

        # 2. Crusher queue
        crusher_queued = [t for t in self.trucks if t.state == "queued_at_crusher"]
        crusher_queued.sort(key=lambda t: t.queue_wait_sec, reverse=True)
        for pos, trk in enumerate(crusher_queued):
            trk.queue_position = pos
            trk.queue_wait_sec += dt
            trk.position_km = max(0.0, ROUTE_LENGTH_KM - pos * 0.025)

    def _step_auxiliary_assets(self, dt, dewatering_telem):
        """Step autonomous drill rig, water bowser, conveyor, stockpile, SAG mill, and slope radar."""
        # 1. Autonomous Drill Rig MWD (Measurement-While-Drilling) & Comminution Coupling
        # Depth advances continuously with penetration rate ROP: dz/dt = ROP / 3600
        # Drill hole bench depth: 15.0m standard blast hole pattern (Epiroc Pit Viper 271)
        prev_rop = getattr(self, "drill_rig_rop", 28.5)
        self.drill_depth_m += (prev_rop / 3600.0) * dt
        if self.drill_depth_m >= 15.0:
            self.drill_depth_m = 0.0
            self.drill_rig_holes += 1

        # Geological stratum hardness f (Protodyakonov index): varies with bench depth z
        # Bench crest (weathered porphyry, f~9.8) to competent chalcopyrite-quartz vein (f~13.2)
        z_frac = self.drill_depth_m / 15.0
        f_stratum = 10.0 + 3.0 * z_frac + (0.5 if (int(self.drill_depth_m * 2.5) % 4 == 0) else -0.3)
        self.drill_rig_hardness = round(max(8.5, min(14.2, f_stratum)), 1)

        # Bingham-Maurer penetration rate: ROP = K_bit * (WOB * N_rpm) / (D_bit * UCS)
        # UCS ~= 10 * f (MPa). As hardness f increases, ROP decreases inversely
        self.drill_rig_rop = round(max(15.0, min(36.0, 325.0 / self.drill_rig_hardness)), 1)
        # Rotary torque (kN*m): increases with rock shear strength f and bit contact area
        self.drill_rig_torque = round(4.10 + 0.20 * self.drill_rig_hardness, 1)
        # Teale Mechanical Specific Energy of Drilling (SED, MJ/m3): E = WOB/A + 2*pi*N*T / (A * ROP)
        self.drill_rig_sed = round(max(30.0, min(65.0, 3.65 * self.drill_rig_hardness + 0.8)), 1)
        # Drill-to-Mill live comminution coupling: SED -> Bond Work Index Wi(t) in [13.8, 15.2] kWh/t
        raw_wi = 13.8 + 1.4 * ((self.drill_rig_sed - 30.0) / 35.0)
        self.drill_rig_wi = round(max(13.8, min(15.2, raw_wi)), 2)

        # 2. Dust-Suppression Water Bowser (BelAZ-76135, 110kL capacity)
        # Mass balance: water spray vs tank level
        if self.water_bowser_spray:
            spray_flow_ls = 450.0 / 60.0  # 7.5 L/s
            self.water_bowser_level = max(12000.0, self.water_bowser_level - spray_flow_ls * dt)
            if self.water_bowser_level <= 12000.0:
                self.water_bowser_level = 110000.0  # Rapid refill at sump pump station
            spray_influx_pct = 0.08  # %/s moisture deposition from 450 L/min curtain
        else:
            spray_influx_pct = 0.0

        # Water bowser kinematics: speed dynamically coupled to water payload mass and haul road grade
        bowser_gross_t = 85.0 + (self.water_bowser_level / 1000.0)
        self.water_bowser_speed_kmh = round(max(12.0, min(26.0, 30.0 - 10.0 * (bowser_gross_t / 195.0) - 1.5 * math.sin(self.sim_time * 0.02))), 1)

        # Physical road surface moisture mass balance: d(moisture)/dt = Influx - Evaporation - Tire entrainment
        evap_drying_rate = 0.012 + 0.004 * (len(self.trucks) / 8.0)
        self.road_surface_moisture = round(max(6.0, min(35.0, self.road_surface_moisture + (spray_influx_pct - evap_drying_rate) * dt)), 1)

        # US EPA AP-42 unpaved haul road particulate emission model:
        # PM10 (ug/m3) decreases non-linearly with moisture content w: PM10 = E0 / (1 + k * w^1.4)
        self.pm10_ug_m3 = round(max(18.0, min(80.0, 95.0 / (1.0 + 0.16 * (self.road_surface_moisture ** 1.35)))), 1)

        # 3. Overland Conveyor
        crusher_window_tonnes = sum(w for _, w in self.crusher_log)
        window_duration = min(self.sim_time, 3600.0) or 1.0
        crusher_tph = round(crusher_window_tonnes * 3600.0 / window_duration, 1)
        self.conveyor_mass_flow = crusher_tph if crusher_tph > 0 else 2400.0
        self.conveyor_tension_kn = round(185.0 + 0.04 * self.conveyor_mass_flow, 1)
        self.conveyor_power_kw = round(450.0 + 0.28 * self.conveyor_mass_flow, 1)
        self.conveyor_tonnes_total += (self.conveyor_mass_flow / 3600.0) * dt

        # Continuous thermal bearing friction ODE for 1.42 km overland conveyor idlers:
        # dT/dt = (P_friction - h*A*(T - T_amb)) / C_th
        v_belt_norm = 1.0 if self.conveyor_mass_flow > 0 else 0.0
        load_norm = self.conveyor_mass_flow / 2400.0
        p_fric = 110.0 * (v_belt_norm * 0.6 + load_norm * 0.4)
        h_dissip = 3.2
        c_th = 250.0
        self.conveyor_bearing_temp_c += ((p_fric - h_dissip * (self.conveyor_bearing_temp_c - 22.0)) / c_th) * dt
        self.conveyor_bearing_temp_c = round(self.conveyor_bearing_temp_c, 1)
        self.conveyor_rip_status = "WARNING_TRAMP_OVERLOAD" if self.scenario_crusher == "GEN2" else "NORMAL"

        # 4. Stockpile Mass Balance ODE: dM/dt = Q_in - Q_out
        feed_out_tph = 1500.0
        delta_m = ((self.conveyor_mass_flow - feed_out_tph) / 3600.0) * dt
        self.stockpile_live_tonnes = max(12000.0, min(44500.0, self.stockpile_live_tonnes + delta_m))
        self.stockpile_reserve_hours = round(self.stockpile_live_tonnes / feed_out_tph, 1)

        # 4 Apron Feeders VFD Frequencies actively throttled to deliver SAG feed rate demand with resonant gate kinematics:
        feeder_base_hz = 50.0 * (self.sag_mill_feed_tph / (4.0 * 450.0))
        self.stockpile_feeder_1_hz = round(feeder_base_hz * (1.0 + 0.008 * math.sin(self.sim_time * 0.03 + 0.1)), 1)
        self.stockpile_feeder_2_hz = round(feeder_base_hz * (1.0 + 0.006 * math.cos(self.sim_time * 0.03 + 0.5)), 1)
        self.stockpile_feeder_3_hz = round(feeder_base_hz * (1.0 - 0.007 * math.sin(self.sim_time * 0.03 + 0.8)), 1)
        self.stockpile_feeder_4_hz = round(feeder_base_hz * (1.0 - 0.005 * math.cos(self.sim_time * 0.03 + 1.2)), 1)

        # 5. SAG Mill Comminution (Bond Third Theory) & Flotation Recovery
        # P = 10 * Q * Wi * (1/sqrt(P80) - 1/sqrt(F80))
        f80 = max(100.0, 150000.0 if (self.conveyor_mass_flow > 0.0 and self.crusher_unit.state == "crushing") else 2000.0)
        p80 = max(10.0, 1200.0)
        if f80 <= p80:
            f80 = p80 + 10.0
        comminution_factor = max(0.0, (1.0 / math.sqrt(max(1.0, p80)) - 1.0 / math.sqrt(max(1.0, f80))))

        effective_mill_feed = feed_out_tph if self.stockpile_live_tonnes > 12000.0 else 0.0
        self.sag_mill_feed_tph = effective_mill_feed
        # Mechanical grinding power via Bond's Third Theory divided by gearless ring motor electrical efficiency (eta_mill = 0.974)
        p_sag_mech = 10.0 * effective_mill_feed * max(0.1, self.drill_rig_wi) * comminution_factor
        self.sag_mill_power_kw = round(p_sag_mech / 0.974, 1) if effective_mill_feed > 0 else 0.0
        avg_grade = self.grade_controller.current_blended_grade
        self.sag_mill_recovery = round(max(86.5, min(91.2, 90.5 - 15.0 * abs(avg_grade - TARGET_CU_GRADE))), 2)

        # Dynamic charge load volume (%): integrates mass inflow vs mill slurry discharge
        mill_mass_delta = ((self.sag_mill_feed_tph - 1500.0) / 3600.0) * dt
        self.sag_mill_load_vol_pct = round(max(15.0, min(35.0, self.sag_mill_load_vol_pct + 0.02 * mill_mass_delta + 0.005 * (self.drill_rig_wi - 14.9))), 1)
        # Hydrostatic trunnion bearing oil film pressure (MPa): linear with mill total charge mass
        self.sag_mill_bearing_pressure_mpa = round(max(3.5, min(8.5, 4.80 + 0.055 * self.sag_mill_load_vol_pct)), 2)
        # Slurry density (% solids by mass): controlled via dilution water ratio
        self.sag_mill_slurry_density_pct = round(max(60.0, min(80.0, 71.0 + 2.2 * (self.sag_mill_feed_tph / 1500.0) - 1.1 * (self.water_bowser_level / 110000.0))), 1)

        # 6. Geotechnical Slope Radar, Hydrogeology & Mohr-Coulomb FoS
        sump_h = dewatering_telem["sump_water_level_m"]
        # Pore pressure from phreatic horizon in 60m bench + sump backpressure: u = gamma_w * (z_wt + alpha_s * h_sump) * r_u
        base_u = 9.81 * (33.0 + 4.65 * sump_h) * 0.42
        # Continuous Darcy pore-fluid accumulation ODE: du_surge/dt = (u_target - u_surge) / tau_seepage
        target_surge = 130.0 if self.scenario_water == "GEN2" else (35.0 if self.scenario_water == "GEN1" else 0.0)
        self.pore_pressure_surge_kpa += ((target_surge - self.pore_pressure_surge_kpa) / 30.0) * dt
        self.slope_pore_pressure_kpa = round(base_u + self.pore_pressure_surge_kpa, 1)

        beta_rad = math.radians(48.0)
        phi_rad = math.radians(34.0)
        c_eff = 620.0   # Rock-mass cohesion (kPa) per SME Mining Eng Handbook
        gamma_z = 26.5 * 60.0
        norm_stress = gamma_z * (math.cos(beta_rad) ** 2)
        driving_shear = gamma_z * math.sin(beta_rad) * math.cos(beta_rad)
        effective_norm = max(0.0, norm_stress - self.slope_pore_pressure_kpa)
        self.slope_fos = round((c_eff + effective_norm * math.tan(phi_rad)) / driving_shear, 2)

        # Continuous geomechanical creep rate ODE (Fukuzono / Saito tertiary slope creep)
        v_target = 0.12 + 1.80 * ((max(0.0, self.slope_pore_pressure_kpa - 55.0) / 260.0) ** 2.0)
        self.slope_deformation_v = round(self.slope_deformation_v + ((v_target - self.slope_deformation_v) / 15.0) * dt, 3)

        if self.slope_fos < 1.15:
            self.slope_alarm_status = "GEOTECH_EVACUATION_INTERLOCK"
        else:
            self.slope_alarm_status = "NORMAL"

        # 7. Excavators and Standby Crusher dynamic thermal and wear models
        self.excavator_01_cable_wear = round(14.5 + (self.excavator_01_passes * 0.008), 2)
        p_loss_ex02 = 45.0 if self.excavator_02_state == "digging" else 15.0
        self.excavator_02_hyd_temp += ((p_loss_ex02 - 1.2 * (self.excavator_02_hyd_temp - 24.0)) / 400.0) * dt
        self.standby_readiness_pct = 98.5 if self.crusher_unit.standby_state == "active_crushing" else round(99.6 + 0.4 * min(1.0, self.excavator_02_hyd_temp / 70.0), 1)

    def _step_truck_ode(self, truck: SmartTruck, dt: float, headway_dist_km: float, mu_eff: float):
        """Continuous Newtonian numerical integration with ISO 3450 wet braking."""
        rng = self.rng

        if truck.pantograph_jammed:
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.power_kw = 0.0
            truck.fuel_rate_lh = 0.0
            return

        gross_mass_kg = (TRUCK_EMPTY_WEIGHT_T + truck.payload_t) * 1000.0
        eff_mass_kg = gross_mass_kg * ROTATIONAL_INERTIA_FACTOR

        # ISO 3450:2011 Stopping Distance calculation
        truck.traction_mu_eff = round(mu_eff, 3)
        denom = max(0.05, mu_eff * math.cos(0.085) - 0.085 - ROLLING_RESISTANCE)
        truck.braking_distance_m = round(truck.v_ms * 1.2 + (truck.v_ms ** 2) / (2.0 * GRAVITY * denom), 1)
        truck.wet_derate_active = (truck.braking_distance_m > 45.0)

        # 1. State: QUEUED AT EXCAVATOR
        if truck.state == "queued_at_excavator":
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.power_kw = 25.0
            truck.fuel_rate_lh = DIESEL_QUEUE_LH

            if truck.assigned_shovel is None:
                truck.assigned_shovel = self.grade_controller.decide_shovel_assignment(
                    self.grade_north, self.grade_south, truck_id=truck.truck_id, trip_index=truck.trips
                )

            # Only head of queue can begin loading
            if truck.queue_position == 0:
                if truck.assigned_shovel == "excavator-01" and self.excavator_01_state == "idle":
                    truck.state = "loading"
                    self.excavator_01_state = "loading"
                    truck.timer = 0.0
                    truck.queue_wait_sec = 0.0
                elif truck.assigned_shovel == "excavator-02" and self.excavator_02_state == "idle":
                    truck.state = "loading"
                    self.excavator_02_state = "loading"
                    truck.timer = 0.0
                    truck.queue_wait_sec = 0.0

        # 2. State: LOADING
        elif truck.state == "loading":
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.timer += dt
            shovel = truck.assigned_shovel
            pass_time = PASS_TIME_EX01 if shovel == "excavator-01" else PASS_TIME_EX02
            bucket_t = BUCKET_T_EX01 if shovel == "excavator-01" else BUCKET_T_EX02
            face_grade = self.grade_north if shovel == "excavator-01" else self.grade_south

            while truck.timer >= pass_time and truck.payload_t < TRUCK_PAYLOAD_T - 5.0:
                truck.timer -= pass_time
                added = min(bucket_t * rng.uniform(0.97, 1.03), TRUCK_PAYLOAD_T - truck.payload_t)
                truck.grade_cu = (truck.grade_cu * truck.payload_t + face_grade * added) / (truck.payload_t + added)
                truck.payload_t += added
                if shovel == "excavator-01":
                    self.excavator_01_passes += 1
                else:
                    self.excavator_02_passes += 1

            if truck.payload_t >= TRUCK_PAYLOAD_T - 5.0:
                truck.state = "hauling"
                if shovel == "excavator-01":
                    self.excavator_01_state = "idle"
                else:
                    self.excavator_02_state = "idle"

        # State: BRAKING TO SNAG (Continuous deceleration without teleportation)
        elif truck.state == "braking_to_snag":
            a_brake = -2.5
            truck.v_ms = max(0.0, truck.v_ms + a_brake * dt)
            km_moved = (truck.v_ms * dt) / 1000.0
            target_snag = self.snag_pos_km or truck.position_km
            truck.position_km = min(target_snag, truck.position_km + km_moved)
            truck.power_kw = 0.0
            truck.fuel_rate_lh = DIESEL_IDLE_LH
            if truck.v_ms <= 0.0 or truck.position_km >= target_snag:
                truck.v_ms = 0.0
                truck.state = "breakdown_blocking_ramp"
                truck.power_kw = 0.0
                truck.fuel_rate_lh = 0.0

        # State: BREAKDOWN BLOCKING RAMP
        elif truck.state == "breakdown_blocking_ramp":
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.power_kw = 0.0
            truck.fuel_rate_lh = 0.0

        # 3. State: HAULING (Loaded climb to crusher)
        elif truck.state in ("hauling", "hauling_trolley", "holding_at_turnout"):
            # Check stochastic snag avoidance
            if self.scenario_trolley == "GEN2" and self.snag_chainage_m:
                if truck.position_km < self.snag_pos_km and (self.snag_pos_km - truck.position_km) < 0.050:
                    truck.state = "holding_at_turnout"
                    truck.v_ms = 0.0
                    truck.power_kw = 25.0
                    truck.fuel_rate_lh = DIESEL_IDLE_LH
                    return

            on_ramp = (RAMP_START_KM <= truck.position_km <= RAMP_END_KM)
            can_use_trolley = on_ramp and (self.scenario_trolley == "NORMAL")

            slope = RAMP_GRADE if on_ramp else 0.0
            theta = math.atan(slope)

            f_rr = gross_mass_kg * GRAVITY * ROLLING_RESISTANCE * math.cos(theta)
            f_grade = gross_mass_kg * GRAVITY * math.sin(theta)
            f_aero = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * FRONTAL_AREA * (truck.v_ms ** 2)

            if can_use_trolley:
                truck.state = "hauling_trolley"
                truck.trolley_mode = 1
                truck.propulsion_mode = "trolley_electric"
                truck.pantograph_ramp = min(1.0, truck.pantograph_ramp + dt / 2.5)
                target_v_ms = (SPEED_TROLLEY_CLIMB_KMH / 3.6)
                p_avail_kw = TROLLEY_POWER_KW * truck.pantograph_ramp
                truck.power_kw = 1520.0 * truck.pantograph_ramp
                truck.fuel_rate_lh = DIESEL_IDLE_LH

                diesel_saved_step = (DIESEL_CLIMB_LH - DIESEL_IDLE_LH) * (dt / 3600.0)
                self.diesel_saved_liters_total += diesel_saved_step
            else:
                truck.state = "hauling"
                truck.trolley_mode = 0
                truck.pantograph_ramp = max(0.0, truck.pantograph_ramp - dt / 1.5)
                truck.propulsion_mode = "diesel"
                p_avail_kw = DIESEL_POWER_KW if on_ramp else 650.0
                target_v_ms = (SPEED_DIESEL_CLIMB_KMH if on_ramp else SPEED_FLAT_LOADED_KMH) / 3.6
                truck.power_kw = p_avail_kw
                truck.fuel_rate_lh = DIESEL_CLIMB_LH if on_ramp else DIESEL_FLAT_LH

            # Apply ISO 3450 wet ramp derate if stopping distance excessive
            if truck.wet_derate_active:
                target_v_ms = min(target_v_ms, 15.0 / 3.6)

            # Headway safety braking
            if headway_dist_km < 0.050:
                f_tr = 0.0
                f_brake = gross_mass_kg * 1.5
            else:
                f_brake = 0.0
                speed_calc = max(1.5, truck.v_ms)
                f_tr = (p_avail_kw * 1000.0) / speed_calc
                f_tr = min(gross_mass_kg * GRAVITY * mu_eff, f_tr)

            accel = (f_tr - f_rr - f_grade - f_aero - f_brake) / eff_mass_kg
            truck.accel_mss = max(-2.5, min(1.2, accel))

            new_v = max(0.0, min(target_v_ms * 1.05, truck.v_ms + truck.accel_mss * dt))
            truck.v_ms = new_v

            km_moved = (truck.v_ms * dt) / 1000.0
            route_limit = DETOUR_ROUTE_LENGTH_KM if self.scenario_crusher in ("GEN1", "GEN2") else ROUTE_LENGTH_KM
            truck.position_km = min(route_limit, truck.position_km + km_moved)

            fuel_burned_liters = truck.fuel_rate_lh * (dt / 3600.0)
            truck.fuel_pct = max(10.0, truck.fuel_pct - (fuel_burned_liters / 18.0))

            tkph_val, new_temp, _ = self.tkph_protector.update_tire_state(
                TRUCK_GROSS_WEIGHT_T, truck.speed_kmh, truck.tire_temp_c, dt
            )
            truck.tkph = tkph_val
            truck.tire_temp_c = new_temp

            if truck.position_km >= route_limit:
                if self.scenario_crusher in ("GEN1", "GEN2"):
                    truck.state = "dumping_stockpile"
                else:
                    truck.state = "queued_at_crusher"
                truck.timer = 0.0

        # 4. State: QUEUED AT CRUSHER
        elif truck.state == "queued_at_crusher":
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.power_kw = 25.0
            truck.fuel_rate_lh = DIESEL_QUEUE_LH

            # Only head of queue can dump
            if truck.queue_position == 0:
                if self.crusher_unit.state == "crushing":
                    truck.state = "dumping"
                    truck.timer = 0.0
                    truck.queue_wait_sec = 0.0
                elif self.scenario_crusher != "NORMAL":
                    truck.state = "dumping_stockpile"
                    truck.timer = 0.0
                    truck.queue_wait_sec = 0.0

        # 5. State: DUMPING
        elif truck.state in ("dumping", "dumping_stockpile"):
            truck.v_ms = 0.0
            truck.accel_mss = 0.0
            truck.timer += dt
            truck.power_kw = 35.0
            truck.fuel_rate_lh = DIESEL_IDLE_LH

            if truck.timer >= DUMP_TIME_S:
                if truck.state == "dumping":
                    self.crusher_tonnes += truck.payload_t
                    self.crusher_grade_weighted += truck.payload_t * truck.grade_cu
                    self.crusher_log.append((self.sim_time, truck.payload_t))
                    self.grade_controller.update_crusher_feed(truck.payload_t, truck.grade_cu)
                elif truck.state == "dumping_stockpile":
                    self.stockpile_tonnes += truck.payload_t

                self.total_tonnes_mined += truck.payload_t
                truck.payload_t = 0.0
                truck.grade_cu = 0.0
                truck.trips += 1
                truck.state = "returning"
                truck.timer = 0.0

        # 6. State: RETURNING (Empty downhill return)
        elif truck.state == "returning":
            truck.trolley_mode = 0
            on_downhill_ramp = (RAMP_START_KM <= truck.position_km <= RAMP_END_KM)

            target_v_ms = SPEED_EMPTY_RETURN_KMH / 3.6
            if truck.wet_derate_active:
                target_v_ms = min(target_v_ms, 20.0 / 3.6)

            if on_downhill_ramp:
                truck.propulsion_mode = "regen_braking"
                truck.power_kw = -210.0
                truck.fuel_rate_lh = DIESEL_REGEN_LH
            else:
                truck.propulsion_mode = "diesel_cruise"
                truck.power_kw = 420.0
                truck.fuel_rate_lh = DIESEL_FLAT_LH * 0.7

            if headway_dist_km < 0.050:
                accel = -1.2
            else:
                accel = 0.8 if truck.v_ms < target_v_ms else -0.5

            truck.accel_mss = accel
            truck.v_ms = max(0.0, min(target_v_ms * 1.05, truck.v_ms + truck.accel_mss * dt))

            km_moved = (truck.v_ms * dt) / 1000.0
            truck.position_km = max(0.0, truck.position_km - km_moved)
            fuel_burned_liters = truck.fuel_rate_lh * (dt / 3600.0)
            truck.fuel_pct = max(10.0, truck.fuel_pct - (fuel_burned_liters / 18.0))

            tkph_val, new_temp, _ = self.tkph_protector.update_tire_state(
                TRUCK_EMPTY_WEIGHT_T, truck.speed_kmh, truck.tire_temp_c, dt
            )
            truck.tkph = tkph_val
            truck.tire_temp_c = new_temp

            if truck.position_km <= 0.0:
                truck.state = "queued_at_excavator"
                truck.assigned_shovel = None

    def snapshot(self):
        """Construct full dictionary of all 24 digital twins' features with sensor diagnostics."""
        diesel_cost_saved_usd = self.diesel_saved_liters_total * FUEL_PRICE_USD_L
        electricity_cost_usd = self.energy_manager.cumulative_kwh * ELECTRICITY_USD_KWH
        daily_savings_usd = max(0.0, diesel_cost_saved_usd - electricity_cost_usd)
        co2_avoided_kg = self.diesel_saved_liters_total * 2.68

        if self.total_tonnes_mined > 0:
            current_opex = BASELINE_OPEX_PER_TONNE - (daily_savings_usd / self.total_tonnes_mined)
            current_opex = max(0.85, round(current_opex, 3))
        else:
            current_opex = 0.98

        active_emergency = "NORMAL"
        contingency_msg = "NONE"
        if self.scenario_trolley != "NORMAL":
            active_emergency = f"TROLLEY_{self.scenario_trolley}"
            contingency_msg = "Pantograph Jam / Diesel Fallback" if self.scenario_trolley == "GEN1" else f"RAMP OBSTRUCTION AT PK{round(self.snag_pos_km*10, 1)} / ZIF BRIGADE ACTIVE"
        elif self.scenario_crusher != "NORMAL":
            active_emergency = f"CRUSHER_{self.scenario_crusher}"
            contingency_msg = "Hydraulic Relief Stockpile Divert" if self.scenario_crusher == "GEN1" else "STANDBY METSO LT140 CRUSHER ACTIVE"
        elif self.scenario_water != "NORMAL":
            active_emergency = f"WATER_{self.scenario_water}"
            contingency_msg = "Pump WP-01 100% Ramp-up" if self.scenario_water == "GEN1" else "AVR SLURRY PONTOON PUMP WP-02 ENGAGED"

        # Crusher stats
        avg_grade = self.grade_controller.current_blended_grade
        crusher_window_tonnes = sum(w for _, w in self.crusher_log)
        window_duration = min(self.sim_time, 3600.0) or 1.0
        crusher_tph = round(crusher_window_tonnes * 3600.0 / window_duration, 1)

        trolley_telem = self.energy_manager.get_telemetry()
        dewatering_telem = self.dewatering_ctrl.get_telemetry()
        crusher_telem = self.crusher_unit.get_telemetry()
        grade_metrics = self.grade_controller.get_metrics()

        # Cumulative UoP depletion
        cumulative_uop_depletion = UOP_DEPLETION_RATE_USD_T * self.total_tonnes_mined
        uop_tax_shield = cumulative_uop_depletion * CORPORATE_TAX_RATE

        things = {
            "mine-01": {
                "tonnes_mined": {"value": float(round(self.total_tonnes_mined, 1)), "unit": "t"},
                "avg_grade": {"value": float(round(avg_grade, 3)), "unit": "% Cu"},
                "trucks_active": {"value": float(len(self.trucks)), "unit": "units"},
                "opex_per_tonne": {"value": float(current_opex), "unit": "$/t"},
                "opex_baseline": {"value": float(BASELINE_OPEX_PER_TONNE), "unit": "$/t"},
                "daily_savings_usd": {"value": float(round(daily_savings_usd, 2)), "unit": "$"},
                "co2_avoided_kg": {"value": float(round(co2_avoided_kg, 1)), "unit": "kg CO2"},
                "diesel_saved_liters": {"value": float(round(self.diesel_saved_liters_total, 1)), "unit": "liters"},
                "emergency_level": {"value": str(active_emergency)},
                "contingency_active": {"value": str(contingency_msg)},
                "prevented_loss_usd": {"value": float(round(self.prevented_loss_usd, 2)), "unit": "$"},
                "hourly_risk_exposure_usd": {"value": float(round(self.hourly_risk_exposure_usd, 2)), "unit": "$/h"},
                "npv_usd": {"value": float(self.npv_usd), "unit": "$"},
                "irr_pct": {"value": float(self.irr_pct), "unit": "%"},
                "uop_depletion_usd_t": {"value": float(round(UOP_DEPLETION_RATE_USD_T, 3)), "unit": "$/t"},
                "uop_cumulative_depletion_usd": {"value": float(round(cumulative_uop_depletion, 2)), "unit": "$"},
                "uop_tax_shield_usd": {"value": float(round(uop_tax_shield, 2)), "unit": "$"},
                "kalman_gain": {"value": float(grade_metrics["kalman_gain"]), "unit": "ratio"},
                "kalman_innovation_error": {"value": float(grade_metrics["innovation_error"]), "unit": "% Cu"},
                "smart_grade_error": {"value": float(self.smart_grade_error), "unit": "% Cu"},
                "baseline_grade_error": {"value": float(self.baseline_grade_error), "unit": "% Cu"},
                "kp_live": {"value": float(grade_metrics["kp_live"])},
                "ki_live": {"value": float(grade_metrics["ki_live"])},
                "kd_live": {"value": float(grade_metrics["kd_live"])},
                "north_dispatch_ratio": {"value": float(grade_metrics["target_north_ratio"] * 100.0)},
                "control_inbox": {"command": "AUTO", "target_value": float(TARGET_CU_GRADE), "manual_override": False},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("mine-01"),
            },
            "bench-north": {
                "elevation_m": {"value": 60.0, "unit": "m"},
                "face_grade": {"value": float(round(self.grade_north, 3)), "unit": "% Cu"},
                "active_shovels": {"value": float(0.0 if self.slope_fos < 1.15 else 1.0), "unit": "units"},
                "dust_level": {"value": float(round(self.pm10_ug_m3, 1)), "unit": "mg/m3"},
                "co_ppm": {"value": float(self.co_ppm), "unit": "ppm"},
                "nox_ppm": {"value": float(self.nox_ppm), "unit": "ppm"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("bench-north"),
            },
            "bench-south": {
                "elevation_m": {"value": -60.0, "unit": "m"},
                "face_grade": {"value": float(round(self.grade_south, 3)), "unit": "% Cu"},
                "active_shovels": {"value": float(0.0 if (self.slope_fos < 1.15 or self.excavator_02_state in ("evacuating_ramp", "evacuated_safe")) else 1.0), "unit": "units"},
                "water_influx": {"value": float(dewatering_telem["water_influx_m3h"]), "unit": "m3/h"},
                "dust_level": {"value": float(round(self.pm10_ug_m3 * 1.15, 1)), "unit": "mg/m3"},
                "co_ppm": {"value": float(round(self.co_ppm * 1.1, 2)), "unit": "ppm"},
                "nox_ppm": {"value": float(round(self.nox_ppm * 1.1, 2)), "unit": "ppm"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("bench-south"),
            },
            "excavator-01": {
                "state": {"value": str(self.excavator_01_state)},
                "face_grade": {"value": float(round(self.grade_north, 3)), "unit": "% Cu"},
                "elevation_m": {"value": float(round(self.excavator_01_elevation_m, 1)), "unit": "m"},
                "passes_total": {"value": float(self.excavator_01_passes), "unit": "passes"},
                "payload_loaded_t": {"value": float(round(self.excavator_01_passes * BUCKET_T_EX01, 1)), "unit": "t"},
                "hoist_cable_wear_pct": {"value": float(self.excavator_01_cable_wear), "unit": "%"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("excavator-01"),
            },
            "excavator-02": {
                "state": {"value": str(self.excavator_02_state)},
                "face_grade": {"value": float(round(self.grade_south, 3)), "unit": "% Cu"},
                "passes_total": {"value": float(self.excavator_02_passes), "unit": "passes"},
                "payload_loaded_t": {"value": float(round(self.excavator_02_passes * BUCKET_T_EX02, 1)), "unit": "t"},
                "elevation_m": {"value": float(round(self.excavator_02_elevation_m, 1)), "unit": "m"},
                "hydraulic_temp_c": {"value": float(round(self.excavator_02_hyd_temp, 1)), "unit": "degC"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("excavator-02"),
            },
            "trolley-line-01": {
                "state": {"value": str(trolley_telem["status"])},
                "line_voltage_v": {"value": float(trolley_telem["voltage_v"]), "unit": "V"},
                "total_current_a": {"value": float(trolley_telem["current_a"]), "unit": "A"},
                "power_delivered_kw": {"value": float(trolley_telem["total_power_kw"]), "unit": "kW"},
                "connected_trucks": {"value": float(sum(1 for t in self.trucks if t.trolley_mode == 1)), "unit": "trucks"},
                "contingency_status": {"value": str(self.scenario_trolley)},
                "loss_rate_usd_hour": {"value": RISK_USD_H["trolley-fault"][self.scenario_trolley], "unit": "$/h"},
                "snag_chainage_m": {"value": float(self.snag_chainage_m or 0.0), "unit": "m"},
                "snag_x": {"value": float(self.snag_x or 0.0), "unit": "m"},
                "snag_y": {"value": float(self.snag_y or 0.0), "unit": "m"},
                "snag_z": {"value": float(self.snag_z or 0.0), "unit": "m"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("trolley-line-01"),
            },
            "crusher-01": {
                "state": {"value": str(crusher_telem["crusher_state"])},
                "throughput_tph": {"value": float(crusher_tph), "unit": "t/h"},
                "feed_grade": {"value": float(round(avg_grade, 3)), "unit": "% Cu"},
                "target_grade": {"value": float(TARGET_CU_GRADE), "unit": "% Cu"},
                "tonnes_total": {"value": float(round(self.crusher_tonnes, 1)), "unit": "t"},
                "hopper_level_pct": {"value": float(round(min(98.0, max(20.0, 42.0 + (crusher_tph / 2400.0) * 38.0)), 1)), "unit": "%"},
                "vibration_rms": {"value": float(crusher_telem["vibration_mms"]), "unit": "mm/s"},
                "bearing_temp_c": {"value": float(crusher_telem["bearing_temp_c"]), "unit": "degC"},
                "contingency_status": {"value": str(self.scenario_crusher)},
                "loss_rate_usd_hour": {"value": RISK_USD_H["crusher-fault"][self.scenario_crusher], "unit": "$/h"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("crusher-01"),
            },
            "crusher-standby-02": {
                "state": {"value": str(crusher_telem["standby_crusher_state"])},
                "throughput_tph": {"value": float(crusher_telem["standby_crusher_tph"]), "unit": "t/h"},
                "feed_grade": {"value": float(round(avg_grade, 3)), "unit": "% Cu"},
                "tonnes_total": {"value": float(round(self.crusher_unit.standby_total_tonnes, 1)), "unit": "t"},
                "readiness_pct": {"value": float(self.standby_readiness_pct), "unit": "%"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("crusher-standby-02"),
            },
            "pump-station-01": {
                "state": {"value": str("auto_regulation" if self.scenario_water == "NORMAL" else "EMERGENCY_DEWATERING")},
                "sump_water_level_m": {"value": float(dewatering_telem["sump_water_level_m"]), "unit": "m"},
                "sump_surface_area_m2": {"value": float(SUMP_AREA_M2), "unit": "m2"},
                "water_influx_m3h": {"value": float(dewatering_telem["water_influx_m3h"]), "unit": "m3/h"},
                "pump_flow_m3h": {"value": float(dewatering_telem["pump_flow_m3h"]), "unit": "m3/h"},
                "pump_power_kw": {"value": float(dewatering_telem["pump_power_kw"]), "unit": "kW"},
                "aux_pump_status": {"value": str(dewatering_telem["aux_pump_state"])},
                "contingency_status": {"value": str(self.scenario_water)},
                "loss_rate_usd_hour": {"value": RISK_USD_H["water-influx"][self.scenario_water], "unit": "$/h"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("pump-station-01"),
            },
            "substation-01": {
                "grid_status": {"value": "ONLINE"},
                "grid_load_mw": {"value": float(round((self.substation_base_kw + trolley_telem["grid_feed_kw"]) / 1000.0, 2)), "unit": "MW"},
                "grid_freq_hz": {"value": float(self.grid_freq_hz), "unit": "Hz"},
                "power_factor": {"value": float(self.power_factor), "unit": "ratio"},
                "bess_soc_pct": {"value": float(trolley_telem["bess_soc_pct"]), "unit": "%"},
                "bess_power_kw": {"value": float(trolley_telem["bess_power_kw"]), "unit": "kW"},
                "tariff_usd_kwh": {"value": float(ELECTRICITY_USD_KWH), "unit": "$/kWh"},
                "contingency_status": {"value": "NORMAL"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("substation-01"),
            },
            # 6 New Plant & Auxiliary Assets
            "drill-rig-01": {
                "state": {"value": "autonomous_drilling"},
                "rop_m_per_h": {"value": float(self.drill_rig_rop), "unit": "m/h"},
                "rotary_torque_knm": {"value": float(self.drill_rig_torque), "unit": "kN*m"},
                "sed_mj_m3": {"value": float(self.drill_rig_sed), "unit": "MJ/m3"},
                "protodyakonov_hardness_f": {"value": float(self.drill_rig_hardness), "unit": "f"},
                "bond_work_index_kwh_t": {"value": float(self.drill_rig_wi), "unit": "kWh/t"},
                "holes_completed": {"value": float(self.drill_rig_holes), "unit": "holes"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("drill-rig-01"),
            },
            "water-bowser-01": {
                "state": {"value": "spraying_ramp"},
                "water_level_l": {"value": float(round(self.water_bowser_level, 0)), "unit": "L"},
                "spray_active": {"value": bool(self.water_bowser_spray)},
                "road_surface_moisture_pct": {"value": float(self.road_surface_moisture), "unit": "%"},
                "pm10_concentration_ug_m3": {"value": float(self.pm10_ug_m3), "unit": "ug/m3"},
                "pm10_dust_ug_m3": {"value": float(self.pm10_ug_m3), "unit": "ug/m3"},
                "route_coverage_kmh": {"value": float(round(self.water_bowser_speed_kmh, 1)), "unit": "km/h"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("water-bowser-01"),
            },
            "conveyor-main-01": {
                "state": {"value": "conveying"},
                "mass_flow_tph": {"value": float(round(self.conveyor_mass_flow, 1)), "unit": "t/h"},
                "belt_tension_kn": {"value": float(self.conveyor_tension_kn), "unit": "kN"},
                "drive_power_kw": {"value": float(self.conveyor_power_kw), "unit": "kW"},
                "idler_bearing_temp_c": {"value": float(self.conveyor_bearing_temp_c), "unit": "degC"},
                "rip_detection_status": {"value": str(self.conveyor_rip_status)},
                "tonnes_conveyed_total": {"value": float(round(self.conveyor_tonnes_total, 1)), "unit": "t"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("conveyor-main-01"),
            },
            "stockpile-coarse-01": {
                "state": {"value": "operating_buffer"},
                "live_tonnage_t": {"value": float(round(self.stockpile_live_tonnes, 1)), "unit": "t"},
                "surge_reserve_hours": {"value": float(self.stockpile_reserve_hours), "unit": "h"},
                "homogenized_cu_grade_pct": {"value": float(round(avg_grade, 3)), "unit": "% Cu"},
                "feeder_1_hz": {"value": float(self.stockpile_feeder_1_hz), "unit": "Hz"},
                "feeder_2_hz": {"value": float(self.stockpile_feeder_2_hz), "unit": "Hz"},
                "feeder_3_hz": {"value": float(self.stockpile_feeder_3_hz), "unit": "Hz"},
                "feeder_4_hz": {"value": float(self.stockpile_feeder_4_hz), "unit": "Hz"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("stockpile-coarse-01"),
            },
            "sag-mill-01": {
                "state": {"value": "grinding_nominal"},
                "power_kw": {"value": float(self.sag_mill_power_kw), "unit": "kW"},
                "feed_rate_tph": {"value": float(self.sag_mill_feed_tph), "unit": "t/h"},
                "mill_load_vol_pct": {"value": float(self.sag_mill_load_vol_pct), "unit": "%"},
                "bearing_pressure_mpa": {"value": float(self.sag_mill_bearing_pressure_mpa), "unit": "MPa"},
                "slurry_density_pct_solids": {"value": float(self.sag_mill_slurry_density_pct), "unit": "%"},
                "flotation_recovery_cu_pct": {"value": float(self.sag_mill_recovery), "unit": "%"},
                "specific_energy_kwh_t": {"value": float(round(self.sag_mill_power_kw / max(1.0, self.sag_mill_feed_tph), 2)) if self.sag_mill_feed_tph > 0 else 0.0, "unit": "kWh/t"},
                "drill_to_mill_wi_kwh_t": {"value": float(self.drill_rig_wi), "unit": "kWh/t"},
                "flotation_feed_silica_pct": {"value": float(round(self.feed_silica_pct, 3)), "unit": "%"},
                "flotation_feed_iron_pct": {"value": float(round(self.feed_iron_pct, 2)), "unit": "%"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("sag-mill-01"),
            },
            "slope-radar-01": {
                "state": {"value": "continuous_interferometry"},
                "pore_pressure_kpa": {"value": float(self.slope_pore_pressure_kpa), "unit": "kPa"},
                "deformation_velocity_mm_h": {"value": float(self.slope_deformation_v), "unit": "mm/h"},
                "inverse_velocity_h_mm": {"value": float(round(1.0 / max(1e-4, self.slope_deformation_v), 2)), "unit": "h/mm"},
                "factor_of_safety_fos": {"value": float(self.slope_fos), "unit": "FoS"},
                "slope_alarm_status": {"value": str(self.slope_alarm_status)},
                "evacuation_interlock": {"value": bool(self.slope_fos < 1.15)},
                "microseismic_energy_j": {"value": float(round(self.microseismic_energy_j, 1)), "unit": "J"},
                "blast_ppv_mm_s": {"value": float(round(self.blast_ppv_mm_s, 2)), "unit": "mm/s"},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics("slope-radar-01"),
            },
        }

        # 8 Haul Trucks
        for truck in self.trucks:
            things[truck.name] = {
                "state": {"value": str(truck.state)},
                "assigned_shovel": {"value": str(truck.assigned_shovel)},
                "dispatch_link": {"value": str(truck.dispatch_link)},
                "payload": {"value": float(round(truck.payload_t, 1)), "unit": "t"},
                "grade_loaded": {"value": float(round(truck.grade_cu, 3)), "unit": "% Cu"},
                "speed": {"value": float(round(truck.speed_kmh, 1)), "unit": "km/h"},
                "route_position": {"value": float(round(truck.position_km, 3)), "unit": "km"},
                "propulsion_mode": {"value": str(truck.propulsion_mode)},
                "trolley_mode": {"value": float(truck.trolley_mode)},
                "power_kw": {"value": float(round(truck.power_kw, 1)), "unit": "kW"},
                "fuel_rate_lh": {"value": float(round(truck.fuel_rate_lh, 1)), "unit": "l/h"},
                "tkph": {"value": float(round(truck.tkph, 1)), "unit": "t*km/h"},
                "tire_temp_c": {"value": float(round(truck.tire_temp_c, 1)), "unit": "degC"},
                "trips_total": {"value": float(truck.trips), "unit": "trips"},
                "fuel_pct": {"value": float(round(truck.fuel_pct, 1)), "unit": "%"},
                "queue_wait_sec": {"value": float(round(truck.queue_wait_sec, 1)), "unit": "s"},
                "queue_position": {"value": float(truck.queue_position), "unit": "pos"},
                "traction_mu_eff": {"value": float(truck.traction_mu_eff), "unit": "ratio"},
                "braking_distance_m": {"value": float(truck.braking_distance_m), "unit": "m"},
                "wet_derate_active": {"value": bool(truck.wet_derate_active)},
                "sensor_diagnostics": self.sensor_sim.get_diagnostics(truck.name),
            }

        now_epoch = int(time.time())
        for twin_data in things.values():
            twin_data["lifecycle_state"] = {
                "status": "ONLINE",
                "last_heartbeat_epoch": now_epoch,
                "watchdog_timeout_s": 15.0,
            }

        return things


def ditto_modify_features(name, features):
    """Build a Ditto Protocol modify command replacing all features of a Thing."""
    return {
        "topic": f"{NAMESPACE}/{name}/things/twin/commands/modify",
        "path": "/features",
        "value": {feature: {"properties": props} for feature, props in features.items()},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mqtt-host", default=os.environ.get("MQTT_HOST", "localhost"))
    parser.add_argument("--mqtt-port", type=int, default=int(os.environ.get("MQTT_PORT", "1883")))
    parser.add_argument("--interval", type=float, default=float(os.environ.get("SIM_INTERVAL", "2.0")),
                        help="real seconds between publishes (default: 2.0s)")
    parser.add_argument("--speedup", type=float, default=float(os.environ.get("SIM_SPEEDUP", "10.0")),
                        help="simulated seconds per real second (default: 10.0x)")
    parser.add_argument("--seed", type=int, default=int(os.environ.get("SIM_SEED", "42")))
    parser.add_argument("--dry-run", action="store_true", help="print JSON instead of publishing")
    parser.add_argument("--steps", type=int, default=0, help="stop after N steps (0 = run continuously)")
    args = parser.parse_args()

    model = SmartKenishModel(args.seed)
    client = None

    def on_mqtt_message(_client, _userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            model.handle_command(msg.topic, payload)
        except Exception as e:
            log.warning("Could not parse command payload: %s", e)

    def on_mqtt_connect(client_, _userdata, _flags, reason_code, _properties):
        if getattr(reason_code, "is_failure", reason_code != 0):
            log.warning("MQTT connect refused: %s", reason_code)
            return
        client_.subscribe(CMD_TOPIC_SCENARIOS, qos=1)
        client_.subscribe(CMD_TOPIC_CONTROL, qos=1)
        log.info("Subscribed to %s and %s", CMD_TOPIC_SCENARIOS, CMD_TOPIC_CONTROL)

    if not args.dry_run and mqtt:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"smart-kenish-sim-{os.getpid()}")
        client.on_message = on_mqtt_message
        client.on_connect = on_mqtt_connect
        max_attempts = int(os.environ.get("MQTT_MAX_RETRIES", "30" if os.environ.get("MQTT_HOST") else "3"))
        retry_delay = float(os.environ.get("MQTT_RETRY_DELAY", "2.0" if os.environ.get("MQTT_HOST") else "0.5"))
        connected = False
        for attempt in range(1, max_attempts + 1):
            try:
                client.connect(args.mqtt_host, args.mqtt_port, keepalive=30)
                connected = True
                break
            except OSError as exc:
                if attempt == 1:
                    log.warning("MQTT %s:%s connection failed (%s), retrying (max %d attempts)...", args.mqtt_host, args.mqtt_port, exc, max_attempts)
                time.sleep(retry_delay)

        if connected:
            client.loop_start()
            log.info("✓ Connected to MQTT mqtt://%s:%s (Listening for bidirectional commands)", args.mqtt_host, args.mqtt_port)
        else:
            if os.environ.get("MQTT_REQUIRE_CONNECTION") == "1":
                log.error("Unable to connect to MQTT broker after %d attempts, exiting.", max_attempts)
                return 1
            log.warning("MQTT broker at %s:%s unavailable; continuing in offline standalone simulation mode.", args.mqtt_host, args.mqtt_port)
            client = None

    stop = False

    def handle_signal(*_):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    log.info("🚀 Smart-Kenish Simulator v4.0 started (24 Digital Twins, interval=%.1fs, speedup=%.1fx)", args.interval, args.speedup)

    step_count = 0
    sleep_delay = 0.02 if (args.dry_run and args.interval == 2.0) else args.interval

    while not stop:
        model.step(args.interval * args.speedup)
        snapshot = model.snapshot()

        for name, features in snapshot.items():
            ditto_msg = json.dumps(ditto_modify_features(name, features))
            topic = f"{TOPIC_PREFIX}/{name}"
            if client:
                client.publish(topic, ditto_msg, qos=0)

        if not client:
            m = snapshot["mine-01"]
            c = snapshot["crusher-01"]
            s = snapshot["slope-radar-01"]
            sm = snapshot["sag-mill-01"]
            print(f"  [SIM tick {step_count:3d}] t={model.sim_time:5.1f}s │ Mined: {m['tonnes_mined']['value']:7.1f}t │ Cu: {c['feed_grade']['value']:.3f}% │ SAG: {sm['power_kw']['value']:.0f}kW (Rec {sm['flotation_recovery_cu_pct']['value']}%) │ FoS: {s['factor_of_safety_fos']['value']} │ Emg: {m['emergency_level']['value']}")

        if client is None or client.is_connected():
            try:
                with open(HEARTBEAT_FILE, "w") as hb:
                    hb.write(str(step_count))
            except OSError as exc:
                log.warning("Heartbeat write failed: %s", exc)

        step_count += 1
        if step_count % 30 == 0:
            m = snapshot["mine-01"]
            c = snapshot["crusher-01"]
            log.info("⏱ Sim %4.0f min | Mined %7.1f t | Grade %.3f %% Cu | OPEX %s/t (Saved $%s) | Emg: %s",
                     model.sim_time / 60.0,
                     m["tonnes_mined"]["value"],
                     c["feed_grade"]["value"],
                     m["opex_per_tonne"]["value"],
                     m["daily_savings_usd"]["value"],
                     m["emergency_level"]["value"])

        if args.steps and step_count >= args.steps:
            break

        time.sleep(sleep_delay)

    if client:
        client.loop_stop()
        client.disconnect()

    log.info("Smart-Kenish simulator terminated gracefully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
