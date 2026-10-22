"""
Dewatering Controller & Sump Mass Balance (Smart-Kenish Module 4).
Hydrogeological mass balance for deep pit -60m sump, staged pump speed control,
and emergency ATS automatic transfer to Barge Pontoon Slurry Pump WP-02.
"""


class DewateringController:
    """
    Simulates sump hydrogeological mass balance:
    dV/dt = Q_inrush - (Q_pump_main + Q_pump_aux)
    Controls staged dewatering pumps:
    - Base duty: WP-01 (Variable frequency centrifugal 48 to 240 m3/h)
    - Crisis ATS: WP-02 (Heavy submersible slurry pump 320 m3/h)
    """

    def __init__(self, sump_area_m2=4500.0, target_level_m=1.15, alarm_level_m=2.50):
        self.sump_area_m2 = sump_area_m2
        self.water_level_m = target_level_m
        self.alarm_level_m = alarm_level_m
        self.target_level_m = target_level_m

        self.water_influx_m3h = 45.0
        self.main_pump_flow_m3h = 48.0
        self.main_pump_power_kw = 45.0
        self.aux_pump_flow_m3h = 0.0
        self.aux_pump_power_kw = 0.0
        self.aux_pump_state = "STANDBY_READY"
        self.evacuation_alarm = False

    def step(self, dt_seconds: float, influx_surge_m3h: float = 0.0, main_pump_choked: bool = False):
        """
        Calculates hydraulic mass balance and governs automated pump cut-in.
        """
        base_influx = 45.0
        self.water_influx_m3h = base_influx + influx_surge_m3h

        # Main pump control
        if main_pump_choked:
            self.main_pump_flow_m3h = 60.0      # Suction strainer heavily restricted by blasted fines
            self.main_pump_power_kw = 110.0     # High current cavitation draw
        elif self.water_level_m > 1.80 or influx_surge_m3h > 100.0:
            self.main_pump_flow_m3h = 240.0     # Run at 100% VFD frequency
            self.main_pump_power_kw = 110.0
        else:
            self.main_pump_flow_m3h = 48.0      # Nominal modulating baseline
            self.main_pump_power_kw = 45.0

        # Automated emergency ATS engagement of Auxiliary Pontoon Slurry Pump WP-02
        if self.water_level_m >= self.alarm_level_m or (influx_surge_m3h > 200.0 and main_pump_choked):
            self.aux_pump_state = "AVR_PONTOON_ACTIVE"
            self.aux_pump_flow_m3h = 320.0
            self.aux_pump_power_kw = 135.0
            self.evacuation_alarm = True
        else:
            self.aux_pump_state = "STANDBY_READY"
            self.aux_pump_flow_m3h = 0.0
            self.aux_pump_power_kw = 0.0
            self.evacuation_alarm = False

        # Hydraulic mass balance: dV/dt = Q_in - Q_out
        total_pumping_m3h = self.main_pump_flow_m3h + self.aux_pump_flow_m3h
        net_flow_m3s = (self.water_influx_m3h - total_pumping_m3h) / 3600.0
        delta_height = (net_flow_m3s * dt_seconds) / self.sump_area_m2

        self.water_level_m = max(0.40, min(4.80, self.water_level_m + delta_height))

    def reset_nominal(self):
        self.water_level_m = self.target_level_m
        self.water_influx_m3h = 45.0
        self.main_pump_flow_m3h = 48.0
        self.main_pump_power_kw = 45.0
        self.aux_pump_state = "STANDBY_READY"
        self.aux_pump_flow_m3h = 0.0
        self.aux_pump_power_kw = 0.0
        self.evacuation_alarm = False

    def get_telemetry(self) -> dict:
        return {
            "sump_water_level_m": round(self.water_level_m, 2),
            "water_influx_m3h": round(self.water_influx_m3h, 1),
            "pump_flow_m3h": round(self.main_pump_flow_m3h + self.aux_pump_flow_m3h, 1),
            "pump_power_kw": round(self.main_pump_power_kw + self.aux_pump_power_kw, 1),
            "aux_pump_state": self.aux_pump_state,
            "alarm_active": self.evacuation_alarm,
        }
