"""
Sensor Degradation Simulator (Smart-Kenish Module 6).
Simulates realistic industrial sensor physical imperfections:
- High-frequency Gaussian measurement noise
- Slow calibration drift over time
- Random packet dropouts & CRC check failures
Provides sensor diagnostic telemetry for predictive maintenance in Eclipse Ditto twins.
"""

import math
import random


class SensorDegradationSimulator:
    """
    Sensor physics and communication bus imperfection simulator.
    Ensures telemetry exhibits realistic physical behavior instead of idealized noiseless signals.
    """

    def __init__(self, seed=42, dropout_rate=0.005):
        self.rng = random.Random(seed)
        self.dropout_rate = dropout_rate
        self.sim_time = 0.0
        self.crc_error_counts = {}
        self.drift_offsets = {}

    def step(self, dt: float = 1.0, active_sensors: list = None):
        """Advance physical simulation time and update stochastic degradation dynamics."""
        self.sim_time += dt
        targets = active_sensors if active_sensors is not None else list(self.drift_offsets.keys())
        for sid in targets:
            if sid not in self.drift_offsets:
                self.drift_offsets[sid] = 0.0
                self.crc_error_counts[sid] = 0
            # Continuous physical thermal/calibration drift ODE
            self.drift_offsets[sid] += self.rng.gauss(0, 0.0001 * dt)
            self.drift_offsets[sid] = max(-0.05, min(0.05, self.drift_offsets[sid]))
            # Dynamic packet dropout & CRC error accumulation
            p_drop = self.dropout_rate * (dt / 1.0)
            if self.rng.random() < p_drop:
                self.crc_error_counts[sid] += 1

    def degrade_stream(self, sensor_id: str, raw_value: float, noise_std_dev: float = 0.02, drift_rate_per_hour: float = 0.001) -> tuple[float, bool]:
        """Degrades a live telemetry measurement stream with physical noise and calibration drift."""
        return self.apply_sensor_noise(sensor_id, raw_value, noise_std_dev, drift_rate_per_hour)

    def apply_sensor_noise(self, sensor_id: str, raw_value: float, noise_std_dev: float = 0.02, drift_rate_per_hour: float = 0.001) -> tuple[float, bool]:
        """
        Applies Gaussian noise, cumulative calibration drift, and packet dropout probability.
        Returns: (measured_value, packet_valid)
        """
        # Initialize sensor drift state
        if sensor_id not in self.drift_offsets:
            self.drift_offsets[sensor_id] = 0.0
            self.crc_error_counts[sensor_id] = 0

        # Slow thermal/calibration drift
        drift = self.drift_offsets[sensor_id] + self.rng.gauss(0, drift_rate_per_hour * 0.001)
        self.drift_offsets[sensor_id] = max(-0.05 * abs(raw_value + 1e-5), min(0.05 * abs(raw_value + 1e-5), drift))

        # High frequency Gaussian measurement noise
        noise = self.rng.gauss(0, noise_std_dev)

        # Check packet dropout / CRC corruption
        packet_dropped = self.rng.random() < self.dropout_rate
        if packet_dropped:
            self.crc_error_counts[sensor_id] += 1
            return raw_value, False

        noisy_val = raw_value + noise + self.drift_offsets[sensor_id]
        return noisy_val, True

    def get_diagnostics(self, sensor_id: str) -> dict:
        """Return dynamic physical sensor health diagnostics for twin telemetry."""
        if sensor_id not in self.drift_offsets:
            self.drift_offsets[sensor_id] = 0.0
            self.crc_error_counts[sensor_id] = 0
        crc = self.crc_error_counts.get(sensor_id, 0)
        drift = self.drift_offsets.get(sensor_id, 0.0)
        # Dynamic packet loss rate with micro-variations from environmental RF noise
        h = abs(hash(sensor_id)) % 100
        jitter = math.sin(self.sim_time * 0.04 + h * 0.1) * 0.05
        loss_pct = round(max(0.05, min(5.0, (self.dropout_rate * 100.0) + jitter)), 2)
        return {
            "status": "DEGRADED" if crc > 50 else "HEALTHY",
            "packet_loss_pct": loss_pct,
            "crc_errors_total": crc,
            "calibration_drift_offset": round(drift, 4),
        }

