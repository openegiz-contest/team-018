"""
===============================================================================
SMART-KENISH 4.0 :: PRIMARY CRUSHING & HYDRO-RELIEF COORDINATOR (MODULE 5)
===============================================================================

Operational Context & Normative Standards:
- Primary Crusher: KKD-1500/180 Heavy Gyratory Crusher (Nominal throughput: 2400 t/h,
  Closed Side Setting CSS = 180 mm, Drive: 450 kW slip-ring wound rotor motor).
- Reference Catalog: Metso Outotec Superior MK-III Primary Gyratory Crushers.
- Automated Hydraulic Relief: Main shaft hydro-cylinder lowers mantle 150 mm within
  1.8 seconds upon uncrushable tramp metal detection (dipper tooth ingestion).
- Standby Mobile Unit: Metso Lokotrack LT140 Mobile Jaw Crusher (550 t/h nominal,
  Cat C15 310 kW diesel) automatically dispatched to emergency run-of-mine pad.
- Autonomous Buffer: 45,000t Coarse Ore Stockpile dome maintains 19.0 hours of
  continuous SAG mill feed autonomy during major gyratory repairs.

Ditto Twin Mapping:
- Thing IDs: org.openegiz.mine:crusher-01, org.openegiz.mine:crusher-standby-02
- Features: features/crushing_circuit, features/standby_jaw_crusher
===============================================================================
"""


class CrusherProtectionUnit:
    """
    Protective relay and process coordinator for comminution circuit:
    - Primary Crusher: KKD-1500/180 (2400 t/h nominal, 450 kW)
    - Hydraulic Main Shaft Relief: Drops shaft 150 mm to pass uncrushable tramp metal
    - Mobile Standby Unit: Metso LT140 (550 t/h) auto-start to preserve SAG mill feed
    """

    def __init__(self, nominal_tph=2400.0):
        self.nominal_tph = nominal_tph
        self.state = "crushing"
        self.vibration_mms = 2.4
        self.bearing_temp_c = 54.0
        self.hydraulic_relief_active = False
        self.tramp_metal_detected = False

        self.standby_state = "standby_ready"
        self.standby_tph = 0.0
        self.standby_total_tonnes = 0.0

    def step(self, dt_seconds: float, feed_dump_tonnes: float, jam_event: str = "NORMAL"):
        """
        Step comminution protection:
        - jam_event == "GEN1": Tramp metal detected -> auto hydraulic relief opens gap
        - jam_event == "GEN2": Mantle wedging shears mechanical pin -> primary stops, standby LT140 cuts in
        - jam_event == "NORMAL": Nominal steady state
        """
        if jam_event == "GEN1":
            self.state = "AUTO_RELIEF_JAMMED"
            self.tramp_metal_detected = True
            self.hydraulic_relief_active = True
            self.vibration_mms = 7.8
            self.bearing_temp_c = 68.5
            self.standby_state = "standby_ready"
            self.standby_tph = 0.0

        elif jam_event == "GEN2":
            self.state = "CRITICAL_FAILURE_SHEAR_PIN"
            self.tramp_metal_detected = True
            self.hydraulic_relief_active = False
            self.vibration_mms = 0.0
            self.bearing_temp_c = 42.0
            # Auto-start standby crusher Metso LT140
            self.standby_state = "OPERATING_ONLINE"
            self.standby_tph = 550.0
            self.standby_total_tonnes += (self.standby_tph * (dt_seconds / 3600.0))

        else:
            self.state = "crushing"
            self.tramp_metal_detected = False
            self.hydraulic_relief_active = False
            self.vibration_mms = 2.4
            self.bearing_temp_c = 54.0
            self.standby_state = "standby_ready"
            self.standby_tph = 0.0

    def reset_nominal(self):
        self.state = "crushing"
        self.tramp_metal_detected = False
        self.hydraulic_relief_active = False
        self.vibration_mms = 2.4
        self.bearing_temp_c = 54.0
        self.standby_state = "standby_ready"
        self.standby_tph = 0.0

    def get_telemetry(self) -> dict:
        return {
            "crusher_state": self.state,
            "vibration_mms": round(self.vibration_mms, 2),
            "bearing_temp_c": round(self.bearing_temp_c, 1),
            "hydraulic_relief_active": self.hydraulic_relief_active,
            "standby_crusher_state": self.standby_state,
            "standby_crusher_tph": round(self.standby_tph, 1),
        }
