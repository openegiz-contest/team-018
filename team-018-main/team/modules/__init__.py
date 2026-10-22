"""
Smart-Kenish Pluggable Industrial Controllers & Subsystems.
Modular, decoupled control units for the OpenEgiz Digital Mine.
"""

from .grade_blending_controller import GradeBlendingController
from .trolley_energy_manager import TrolleyEnergyManager
from .tkph_thermal_protector import TkphThermalProtector
from .dewatering_controller import DewateringController
from .crusher_protection_unit import CrusherProtectionUnit
from .sensor_degradation_simulator import SensorDegradationSimulator
from .reference_trace_loader import ReferenceTraceLoader

__all__ = [
    "GradeBlendingController",
    "TrolleyEnergyManager",
    "TkphThermalProtector",
    "DewateringController",
    "CrusherProtectionUnit",
    "SensorDegradationSimulator",
    "ReferenceTraceLoader",
]
