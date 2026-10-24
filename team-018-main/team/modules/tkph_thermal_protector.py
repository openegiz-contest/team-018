"""
===============================================================================
SMART-KENISH 4.0 :: TIRE THERMODYNAMICS & ISO 3450 BRAKING MONITOR (MODULE 3)
===============================================================================

Operational Context & Normative Standards:
- Standard: ISO 3450:2011 Earth-moving machinery -- Wheeled machines or high-speed
  rubber-tyred machines -- Performance requirements and test procedures for
  braking systems.
- Tire Standard: Bridgestone Off-The-Road (OTR) Radial VRDP Technical Data Book,
  Specification: 33.00R51 Giant Radial Haul Truck Tires (BelAZ-75131, 136t payload).
- Governing Thermal Equation: Newton-Richman Convective Cooling Differential
  dT_tire/dt = (TKPH - TKPH_base) * k_heat - (T_tire - T_ambient) / tau_cool
  where:
    tau_cool = 1800.0 s (30-minute relaxation time constant)
    k_heat = 0.0018 °C/(TKPH·s) (specific carcass hysteresis heating factor)
    T_ambient = 22.0 °C (nominal pit ambient temperature)

Ditto Twin Mapping:
- Thing IDs: org.openegiz.mine:truck-01 through org.openegiz.mine:truck-08
- Features: features/tire_thermal, features/braking_dynamics
===============================================================================
"""

import math


class TkphThermalProtector:
    """
    Monitors haul truck Ton-Kilometer-Per-Hour (TKPH) and carcass thermal accumulation.
    Applies proactive speed limits when tire thermal limits are approached to prevent
    catastrophic tire carcass delamination or thermal blowout on the 8.5% ramp.
    """

    def __init__(self, rated_tkph: float = 240.0, max_safe_temp_c: float = 88.0):
        """
        Initialize the thermal protector with manufacturer limits.

        Parameters:
        - rated_tkph (float): Maximum continuous TKPH per tire (Bridgestone 33.00R51 rating).
        - max_safe_temp_c (float): Critical carcass threshold (88°C warning, 92°C shutdown).
        """
        self.rated_tkph = rated_tkph
        self.max_safe_temp_c = max_safe_temp_c
        self.cooling_time_constant_s = 1800.0   # 30-minute thermal dissipation constant (tau_cool)
        self.heating_factor = 0.0018            # Carcass hysteresis heating coefficient

    def compute_iso3450_wet_friction(self, moisture_w: float) -> float:
        """
        Computes effective dynamic road-tire friction coefficient under dust suppression irrigation:
        mu_eff(w) = mu_mud_floor + (mu_dry - mu_mud_floor) * exp(-lambda_w * w)
        - w = 0.00 (dry rolled rock): mu_eff = 0.650
        - w = 0.70 (water bowser irrigated): mu_eff = 0.506
        - w = 1.00 (saturated sump zone): mu_eff = 0.461
        """
        mu_mud_floor = 0.22
        mu_dry = 0.65
        lambda_w = 0.58
        return round(mu_mud_floor + (mu_dry - mu_mud_floor) * math.exp(-lambda_w * max(0.0, min(1.0, moisture_w))), 4)

    def compute_stopping_distance_m(self, speed_kmh: float, ramp_grade_rad: float = 0.085, moisture_w: float = 0.0) -> float:
        """
        Evaluates ISO 3450:2011 certified service stopping distance:
        d_stop = v * t_reaction + v^2 / [2 * g * (mu_eff * cos(theta) - sin(theta) - C_rr)]
        """
        v_ms = speed_kmh / 3.6
        t_reaction = 1.20   # ISO 3450 driver reaction and hydraulic pressure buildup time
        g = 9.80665
        mu = self.compute_iso3450_wet_friction(moisture_w)
        c_rr = 0.02         # Rolling resistance of compacted haul road
        
        decel_factor = mu * math.cos(ramp_grade_rad) - math.sin(ramp_grade_rad) - c_rr
        if decel_factor <= 0.05:
            decel_factor = 0.05  # Prevent singularity in catastrophic slippage
            
        braking_distance = (v_ms ** 2) / (2.0 * g * decel_factor)
        total_stopping_distance = (v_ms * t_reaction) + braking_distance
        return round(total_stopping_distance, 2)

    def update_tire_state(self, truck_gross_tonnes: float, speed_kmh: float, current_temp_c: float, dt_seconds: float) -> tuple[float, float, float]:
        """
        Calculates instantaneous TKPH and integrates carcass thermal differential:
        dT/dt = (TKPH - TKPH_base) * k_heat - (T - T_ambient) / tau_cool

        Parameters:
        - truck_gross_tonnes (float): Total gross mass of vehicle (tare 107t + payload 130t = 237.5t).
        - speed_kmh (float): Instantaneous travel velocity along haul segment.
        - current_temp_c (float): Previous integrated carcass temperature.
        - dt_seconds (float): Discrete simulation time step (dt = 2.0s).

        Returns:
        - instant_tkph (float): 6-wheel aggregate instantaneous TKPH metric.
        - new_temp_c (float): Next integrated temperature in Celsius.
        - derate_factor (float): Speed governor multiplier [0.70..1.00].
        """
        # Average load per tire on 6-wheel rigid haul truck: gross_weight / 6
        tire_load_tonnes = truck_gross_tonnes / 6.0
        # Instantaneous TKPH per 6-wheel vehicle envelope
        instant_tkph = tire_load_tonnes * speed_kmh

        ambient_temp_c = 22.0

        # Thermal heating vs convection cooling
        heating_rate = max(0.0, (instant_tkph - 120.0)) * self.heating_factor
        cooling_rate = (current_temp_c - ambient_temp_c) / self.cooling_time_constant_s

        new_temp_c = max(ambient_temp_c, current_temp_c + (heating_rate - cooling_rate) * dt_seconds)

        # Proactive derating curve based on Bridgestone technical limits
        if new_temp_c > 92.0:
            derate_factor = 0.70    # Critical thermal alert: enforce 30% speed reduction
        elif new_temp_c > self.max_safe_temp_c:
            derate_factor = 0.85    # Warning thermal threshold: enforce 15% speed reduction
        else:
            derate_factor = 1.0     # Nominal thermal envelope

        return round(instant_tkph, 1), round(new_temp_c, 2), derate_factor

