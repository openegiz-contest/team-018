"""
TKPH Thermal Protector (Smart-Kenish Module 3).
Continuous tire thermal state modeling and proactive speed derating (Bridgestone / Michelin guidelines).
"""


class TkphThermalProtector:
    """
    Monitors haul truck Ton-Kilometer-Per-Hour (TKPH) and carcass thermal accumulation.
    Applies proactive speed limits when tire thermal limits are approached to prevent
    catastrophic tire carcass delamination or thermal blowout.
    """

    def __init__(self, rated_tkph=240.0, max_safe_temp_c=88.0):
        self.rated_tkph = rated_tkph
        self.max_safe_temp_c = max_safe_temp_c
        self.cooling_time_constant_s = 1800.0   # 30-minute thermal dissipation constant
        self.heating_factor = 0.0018

    def update_tire_state(self, truck_gross_tonnes: float, speed_kmh: float, current_temp_c: float, dt_seconds: float) -> tuple[float, float, float]:
        """
        Calculates instantaneous TKPH and integrates carcass thermal differential:
        dT/dt = (TKPH - TKPH_base) * k_heat - (T - T_ambient) / tau_cool
        Returns: (instant_tkph, new_temp_c, speed_derate_factor)
        """
        # Average load per tire on 6-wheel rigid haul truck: gross_weight / 6
        tire_load_tonnes = truck_gross_tonnes / 6.0
        instant_tkph = tire_load_tonnes * speed_kmh

        ambient_temp_c = 22.0

        # Thermal heating vs convection cooling
        heating_rate = max(0.0, (instant_tkph - 120.0)) * self.heating_factor
        cooling_rate = (current_temp_c - ambient_temp_c) / self.cooling_time_constant_s

        new_temp_c = max(ambient_temp_c, current_temp_c + (heating_rate - cooling_rate) * dt_seconds)

        # Proactive derating curve
        if new_temp_c > 92.0:
            derate_factor = 0.70    # Critical thermal alert: enforce 30% speed reduction
        elif new_temp_c > self.max_safe_temp_c:
            derate_factor = 0.85    # Warning thermal threshold: enforce 15% speed reduction
        else:
            derate_factor = 1.0     # Nominal thermal envelope

        return round(instant_tkph, 1), round(new_temp_c, 2), derate_factor
