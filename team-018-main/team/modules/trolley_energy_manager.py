"""
Trolley Energy Manager & BESS Microgrid Controller (Smart-Kenish Module 2).
Coordinates power flows between 1200V DC catenary line, electric trucks, and 2 MWh BESS.
"""


class TrolleyEnergyManager:
    """
    Manages catenary line power delivery, downhill regenerative energy capture,
    and Battery Energy Storage System (BESS) peak shaving.
    """

    def __init__(self, nominal_voltage=1200.0, bess_capacity_kwh=2000.0, peak_shave_limit_kw=1500.0):
        self.nominal_voltage = nominal_voltage
        self.bess_capacity_kwh = bess_capacity_kwh
        self.peak_shave_limit_kw = peak_shave_limit_kw
        self.voltage_v = nominal_voltage
        self.current_a = 0.0
        self.total_demand_kw = 0.0
        self.grid_feed_kw = 0.0
        self.bess_power_kw = 0.0        # Positive = discharging, Negative = charging
        self.bess_soc_pct = 88.5
        self.cumulative_kwh = 0.0
        self.cumulative_regen_kwh = 0.0
        self.line_status = "ENERGIZED"

    def step(self, dt_seconds: float, active_truck_demands: list, downhill_regen_kw: float, line_fault: bool = False):
        """
        Step microgrid energy balance:
        - If line_fault is True: Catenary is de-energized (0V, 0A).
        - Downhill empty trucks generate regenerative braking power (negative kW).
        - Trucks on catenary ramp draw electric tractive power.
        - BESS buffers peak loads above peak_shave_limit_kw and absorbs downhill regen.
        """
        dt_hours = dt_seconds / 3600.0

        if line_fault:
            self.line_status = "FAULT_DE_ENERGIZED"
            self.voltage_v = 0.0
            self.current_a = 0.0
            self.total_demand_kw = 0.0
            self.grid_feed_kw = 0.0
            self.bess_power_kw = 0.0
            return

        self.line_status = "ENERGIZED"
        self.total_demand_kw = sum(max(0.0, kw) for kw in active_truck_demands)
        regen_available_kw = max(0.0, downhill_regen_kw)

        # Microgrid peak shaving logic:
        # If load > peak_shave_limit_kw, discharge BESS to shave peak off main grid
        excess_peak_kw = max(0.0, self.total_demand_kw - self.peak_shave_limit_kw)
        desired_bess_power = excess_peak_kw - regen_available_kw

        # Enforce SoC boundaries (10% min, 95% max)
        if desired_bess_power > 0 and self.bess_soc_pct <= 10.0:
            # Cannot discharge further
            self.bess_power_kw = 0.0
        elif desired_bess_power < 0 and self.bess_soc_pct >= 95.0:
            # Cannot charge further
            self.bess_power_kw = 0.0
        else:
            self.bess_power_kw = desired_bess_power

        # Net grid feed from utility substation
        self.grid_feed_kw = max(0.0, self.total_demand_kw - max(0.0, self.bess_power_kw) - regen_available_kw)

        # Update BESS SoC
        soc_delta = (-self.bess_power_kw * dt_hours / self.bess_capacity_kwh) * 100.0
        self.bess_soc_pct = max(10.0, min(95.0, self.bess_soc_pct + soc_delta))

        # Update catenary voltage and current under dynamic load (Ohmic drop)
        line_resistance_ohms = 0.035
        self.current_a = (self.total_demand_kw * 1000.0 / self.nominal_voltage) if self.nominal_voltage > 0 else 0.0
        self.voltage_v = max(1050.0, self.nominal_voltage - self.current_a * line_resistance_ohms)

        # Cumulative counters
        self.cumulative_kwh += self.total_demand_kw * dt_hours
        self.cumulative_regen_kwh += regen_available_kw * dt_hours

    def get_telemetry(self) -> dict:
        return {
            "status": self.line_status,
            "voltage_v": round(self.voltage_v, 1),
            "current_a": round(self.current_a, 1),
            "total_power_kw": round(self.total_demand_kw, 1),
            "grid_feed_kw": round(self.grid_feed_kw, 1),
            "bess_soc_pct": round(self.bess_soc_pct, 2),
            "bess_power_kw": round(self.bess_power_kw, 1),
            "cumulative_kwh": round(self.cumulative_kwh, 1),
            "cumulative_regen_kwh": round(self.cumulative_regen_kwh, 1),
        }
