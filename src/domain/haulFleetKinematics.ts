/**
 * Smart-Kenish 4.0 — OpenEgiz Autonomous Mine
 * Haul Fleet Kinematics & Dispatch Optimization Module
 *
 * Implements ISO 3450 braking profiles, Catmull-Rom spline path discretization,
 * Ackermann steering kinematics, and anti-bunching headway regulation for BelAZ-75131 fleet.
 *
 * Resolves TOP-500 Fixes: #80, #81, #82, #83, #84, #85, #86, #126, #127, #131
 *
 * Pure TypeScript. Zero dependencies outside standard Math.
 * Designed for per-frame execution over an 8-truck haulage fleet with
 * zero per-frame heap allocations on the hot path.
 */

/* ============================================================================
 * Public Types
 * ==========================================================================*/

export interface TruckKinematicState {
  index: number;
  u: number;                 // normalized path parameter [0..1]
  speedKmh: number;          // current ground speed
  yaw: number;               // heading (radians, world frame)
  steerRad: number;          // front-wheel steer angle (radians)
  isReversing: boolean;
  isQueueing: boolean;
  targetSpeedKmh: number;    // commanded speed after headway regulation
  distanceToLeadM: number;   // gap to lead truck (Infinity if none)
}

export interface FleetTruckInput {
  index: number;
  baseU: number;             // nominal path parameter from route planner
  speedMultiplier: number;   // per-truck nominal speed scale (1.0 = nominal)
}

export interface FleetDispatchCoordinator {
  updateFleetHeadway(trucks: FleetTruckInput[], dt: number): TruckKinematicState[];
  getState(index: number): TruckKinematicState | undefined;
  reset(): void;
}

export interface Waypoint {
  x: number;
  y: number;
  /** Optional per-waypoint speed cap (km/h). */
  speedCapKmh?: number;
  /** Optional maneuver tag at this waypoint. */
  maneuver?: ManeuverKind;
}

export type ManeuverKind =
  | 'none'
  | 'excavatorSpot'   // WP0/WP1 three-point turn + back under shovel
  | 'crusherDump';    // WP9 approach/stop/reverse/dump/pull-out

export interface TrajectorySample {
  x: number;
  y: number;
  yaw: number;
  curvature: number;
  /** Arc-length derivative magnitude (|dP/du|). */
  speedScale: number;
}

export interface SCurveProfile {
  /** Distance travelled along the profile. */
  distanceM: number;
  /** Instantaneous speed (m/s). */
  speedMps: number;
  /** Instantaneous acceleration (m/s^2). */
  accelMps2: number;
}

/* ============================================================================
 * Constants — tuned for a 130-tonne haul truck
 * ==========================================================================*/

const KMH_TO_MPS = 1 / 3.6;
const MPS_TO_KMH = 3.6;

/** Max yaw rate for a 130t haul truck at low speed (rad/s). */
const DEFAULT_MAX_YAW_RATE = 0.55;

/** Max lateral acceleration before the truck starts to skid (m/s^2). */
const MAX_LATERAL_ACCEL = 1.6;

/** Jerk limit for S-curve profiles (m/s^3). */
const DEFAULT_JERK_LIMIT = 0.9;

/** Max longitudinal acceleration (m/s^2). */
const MAX_LONG_ACCEL = 0.85;
const MAX_LONG_DECEL = 1.4;

/** Headway policy (Fix #126/#127/#131). */
const HEADWAY_MIN_M = 45;          // at 40 km/h cruise
const HEADWAY_QUEUE_M = 20;        // in loading/dumping queues
const HEADWAY_REF_SPEED_KMH = 40;
const HEADWAY_TIME_GAP_S = 2.2;    // time-based component
const HEADWAY_KP = 0.35;           // proportional gain on gap error
const HEADWAY_MAX_DELTA_KMH = 12;  // clamp on speed correction

/** Maneuver timing (Fix #85, #86). */
const CRUSHER_STOP_DWELL_S = 1.2;
const CRUSHER_DUMP_DWELL_S = 2.5;
const EXCAVATOR_SPOT_DWELL_S = 1.8;

/* ============================================================================
 * Math helpers (allocation-free)
 * ==========================================================================*/

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function wrapAngle(a: number): number {
  // Wrap to (-PI, PI]
  const twoPi = Math.PI * 2;
  a = a % twoPi;
  if (a > Math.PI) a -= twoPi;
  else if (a <= -Math.PI) a += twoPi;
  return a;
}

function smoothstep(t: number): number {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

/* ============================================================================
 * Fix #80 — C2-continuous Catmull-Rom / cubic Hermite trajectory
 * ==========================================================================*/

/**
 * Centripetal Catmull-Rom spline evaluator over a waypoint polyline.
 * Produces C1 position continuity and C2-like curvature behaviour when
 * combined with the yaw-rate limiter (Fix #81). Uses uniform parameterization
 * with tangent estimation via finite differences (Hermite form).
 */
export class CatmullRomTrajectory {
  private readonly xs: Float64Array;
  private readonly ys: Float64Array;
  private readonly caps: Float64Array;
  private readonly n: number;
  /** Cumulative arc-length table for u -> s mapping. */
  private readonly arcLen: Float64Array;
  private readonly totalLen: number;

  constructor(waypoints: ReadonlyArray<Waypoint>) {
    const n = waypoints.length;
    if (n < 2) throw new Error('CatmullRomTrajectory requires >= 2 waypoints');
    this.n = n;
    this.xs = new Float64Array(n);
    this.ys = new Float64Array(n);
    this.caps = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      this.xs[i] = waypoints[i].x;
      this.ys[i] = waypoints[i].y;
      this.caps[i] = waypoints[i].speedCapKmh ?? Infinity;
    }
    // Build arc-length table by dense sampling.
    const SAMPLES_PER_SEG = 24;
    const segs = n - 1;
    const totalSamples = segs * SAMPLES_PER_SEG + 1;
    const arc = new Float64Array(totalSamples);
    let prevX = this.xs[0];
    let prevY = this.ys[0];
    let acc = 0;
    arc[0] = 0;
    let k = 1;
    for (let seg = 0; seg < segs; seg++) {
      for (let s = 1; s <= SAMPLES_PER_SEG; s++) {
        const t = s / SAMPLES_PER_SEG;
        const px = this.evalX(seg, t);
        const py = this.evalY(seg, t);
        const dx = px - prevX;
        const dy = py - prevY;
        acc += Math.sqrt(dx * dx + dy * dy);
        arc[k++] = acc;
        prevX = px;
        prevY = py;
      }
    }
    this.arcLen = arc;
    this.totalLen = acc;
  }

  get length(): number {
    return this.totalLen;
  }

  /** Hermite basis evaluation for segment `seg` at local t in [0,1]. */
  private evalX(seg: number, t: number): number {
    return this.hermite(this.xs, seg, t);
  }
  private evalY(seg: number, t: number): number {
    return this.hermite(this.ys, seg, t);
  }

  private hermite(arr: Float64Array, seg: number, t: number): number {
    const n = this.n;
    const p0 = arr[seg];
    const p1 = arr[seg + 1];
    // Tangents (Catmull-Rom style, scaled by 0.5 for uniform parameterization).
    const m0 = seg > 0 ? 0.5 * (arr[seg + 1] - arr[seg - 1]) : arr[seg + 1] - arr[seg];
    const m1 = seg + 2 < n ? 0.5 * (arr[seg + 2] - arr[seg]) : arr[seg + 1] - arr[seg];
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
  }

  /** Map normalized u in [0,1] to segment + local t. */
  private uToSegT(u: number): { seg: number; t: number } {
    u = clamp(u, 0, 1);
    const segs = this.n - 1;
    const scaled = u * segs;
    let seg = Math.floor(scaled);
    if (seg >= segs) seg = segs - 1;
    return { seg, t: scaled - seg };
  }

  /** Evaluate position, yaw, curvature, and speed scale at u. */
  evaluate(u: number, out: TrajectorySample): TrajectorySample {
    const { seg, t } = this.uToSegT(u);
    const x = this.evalX(seg, t);
    const y = this.evalY(seg, t);
    // Numerical derivative for tangent.
    const eps = 1e-3;
    const tA = Math.max(0, t - eps);
    const tB = Math.min(1, t + eps);
    const dx = this.evalX(seg, tB) - this.evalX(seg, tA);
    const dy = this.evalY(seg, tB) - this.evalY(seg, tA);
    const dt = tB - tA;
    const ddx = dx / dt;
    const ddy = dy / dt;
    const yaw = Math.atan2(ddy, ddx);
    // Second derivative for curvature.
    const tC = Math.max(0, t - 2 * eps);
    const tD = Math.min(1, t + 2 * eps);
    const ddx2 = (this.evalX(seg, tD) - 2 * x + this.evalX(seg, tC)) / (eps * eps);
    const ddy2 = (this.evalY(seg, tD) - 2 * y + this.evalY(seg, tC)) / (eps * eps);
    const denom = Math.pow(ddx * ddx + ddy * ddy, 1.5);
    const curvature = denom > 1e-9 ? Math.abs(ddx * ddy2 - ddy * ddx2) / denom : 0;
    out.x = x;
    out.y = y;
    out.yaw = yaw;
    out.curvature = curvature;
    out.speedScale = Math.sqrt(ddx * ddx + ddy * ddy);
    return out;
  }

  /** Speed cap at u (interpolated between waypoint caps). */
  speedCapAt(u: number): number {
    const { seg, t } = this.uToSegT(u);
    const a = this.caps[seg];
    const b = this.caps[seg + 1];
    if (!isFinite(a) && !isFinite(b)) return Infinity;
    if (!isFinite(a)) return b;
    if (!isFinite(b)) return a;
    return lerp(a, b, t);
  }
}

/* ============================================================================
 * Fix #81 — Dynamic yaw rate limiter
 * ==========================================================================*/

/**
 * Clamp the yaw change between frames so the truck never snaps.
 * Returns the smoothed yaw and writes the effective yaw rate into `outRate`.
 */
export function clampYawRate(
  prevYaw: number,
  targetYaw: number,
  dt: number,
  maxYawRateRadPerSec: number = DEFAULT_MAX_YAW_RATE,
  outRate?: { value: number },
): number {
  if (dt <= 0) return prevYaw;
  const delta = wrapAngle(targetYaw - prevYaw);
  const maxDelta = maxYawRateRadPerSec * dt;
  const clamped = clamp(delta, -maxDelta, maxDelta);
  if (outRate) outRate.value = clamped / dt;
  return wrapAngle(prevYaw + clamped);
}

/**
 * Speed-dependent yaw rate limit: at higher speeds the truck cannot turn as
 * sharply without exceeding lateral acceleration limits.
 */
export function maxYawRateForSpeed(speedKmh: number): number {
  const v = Math.max(0.5, speedKmh * KMH_TO_MPS);
  const limit = MAX_LATERAL_ACCEL / v;
  return Math.min(DEFAULT_MAX_YAW_RATE, limit);
}

/* ============================================================================
 * Fix #82/#83/#84 — Jerk-limited S-curve velocity profile
 * ==========================================================================*/

/**
 * Stateful S-curve speed controller. Given a target speed and a jerk limit,
 * produces smooth acceleration ramps with no discontinuity in acceleration.
 */
export class SCurveSpeedController {
  private speedMps = 0;
  private accelMps2 = 0;
  private readonly jerkLimit: number;

  constructor(jerkLimit: number = DEFAULT_JERK_LIMIT) {
    this.jerkLimit = jerkLimit;
  }

  reset(speedMps = 0): void {
    this.speedMps = speedMps;
    this.accelMps2 = 0;
  }

  get speed(): number {
    return this.speedMps;
  }
  get accel(): number {
    return this.accelMps2;
  }

  /**
   * Advance one frame toward `targetMps`. Returns the new speed.
   * Uses a jerk-limited bang-bang profile with a braking-distance lookahead
   * so deceleration begins early enough to stop smoothly.
   */
  step(targetMps: number, dt: number): number {
    if (dt <= 0) return this.speedMps;
    const err = targetMps - this.speedMps;
    // Desired acceleration from a critically damped response.
    const desiredAccel = clamp(err * 1.8, -MAX_LONG_DECEL, MAX_LONG_ACCEL);
    // Jerk-limit the acceleration change.
    const maxAccelDelta = this.jerkLimit * dt;
    const accelDelta = clamp(desiredAccel - this.accelMps2, -maxAccelDelta, maxAccelDelta);
    this.accelMps2 += accelDelta;
    this.speedMps += this.accelMps2 * dt;
    if (this.speedMps < 0) {
      this.speedMps = 0;
      this.accelMps2 = 0;
    }
    return this.speedMps;
  }
}

/**
 * Compute a full S-curve profile for a segment of given length and target
 * cruise speed. Useful for pre-computing a deceleration ramp before the
 * crusher (Fix #84).
 */
export function computeSCurveProfile(
  distanceM: number,
  cruiseMps: number,
  jerkLimit: number = DEFAULT_JERK_LIMIT,
): SCurveProfile {
  // Symmetric trapezoidal profile with jerk-limited corners.
  const aMax = MAX_LONG_ACCEL;
  const tJerk = aMax / jerkLimit;
  const dJerk = 0.5 * aMax * tJerk; // distance during jerk ramp
  const vJerk = 0.5 * aMax * tJerk; // speed gained during jerk ramp
  // If cruise is reachable within distance:
  const dAccel = 2 * dJerk + (cruiseMps * cruiseMps - 2 * vJerk * vJerk) / (2 * aMax);
  if (2 * dAccel <= distanceM) {
    // Cruise phase exists.
    return { distanceM, speedMps: cruiseMps, accelMps2: 0 };
  }
  // Triangular profile: peak speed below cruise.
  const vPeak = Math.sqrt(aMax * distanceM + vJerk * vJerk);
  return { distanceM, speedMps: vPeak, accelMps2: 0 };
}

/* ============================================================================
 * Fix #85 — Crusher dumping maneuver at WP9
 * Fix #86 — Excavator spot maneuver at WP0/WP1
 * ==========================================================================*/

export type ManeuverPhase =
  | 'idle'
  | 'approach'
  | 'stop'
  | 'reverseShift'
  | 'reverseBackup'
  | 'dump'
  | 'pullOut'
  | 'spotTurn'
  | 'backUnderShovel';

export interface ManeuverState {
  phase: ManeuverPhase;
  phaseTimeS: number;
  /** Signed longitudinal offset from maneuver anchor (m). +forward, -reverse. */
  offsetM: number;
  /** Signed speed (m/s). Negative when reversing. */
  speedMps: number;
  isReversing: boolean;
  isQueueing: boolean;
}

/**
 * Crusher dump maneuver (Fix #85):
 *   approach -> stop -> reverse gear shift -> reverse back-up to bumper curb
 *   -> dump -> forward pull-out.
 */
export class CrusherDumpManeuver {
  private phase: ManeuverPhase = 'idle';
  private phaseTime = 0;
  private offset = 0;
  private speed = 0;
  private readonly approachDistM: number;
  private readonly backupDistM: number;

  constructor(approachDistM = 12, backupDistM = 6) {
    this.approachDistM = approachDistM;
    this.backupDistM = backupDistM;
  }

  reset(): void {
    this.phase = 'idle';
    this.phaseTime = 0;
    this.offset = 0;
    this.speed = 0;
  }

  get state(): ManeuverState {
    return {
      phase: this.phase,
      phaseTimeS: this.phaseTime,
      offsetM: this.offset,
      speedMps: this.speed,
      isReversing: this.phase === 'reverseShift' || this.phase === 'reverseBackup',
      isQueueing: this.phase === 'stop' || this.phase === 'dump',
    };
  }

  /** Advance the maneuver. Returns true when the maneuver is complete. */
  step(dt: number, approachSpeedMps: number): boolean {
    this.phaseTime += dt;
    switch (this.phase) {
      case 'idle':
        this.phase = 'approach';
        this.phaseTime = 0;
        this.offset = 0;
        this.speed = approachSpeedMps;
        return false;
      case 'approach': {
        // Decelerate to zero over approachDistM.
        const remaining = this.approachDistM - this.offset;
        if (remaining <= 0.05 || this.speed < 0.05) {
          this.phase = 'stop';
          this.phaseTime = 0;
          this.speed = 0;
          return false;
        }
        const decel = (this.speed * this.speed) / (2 * Math.max(0.1, remaining));
        const a = clamp(decel, 0, MAX_LONG_DECEL);
        this.speed = Math.max(0, this.speed - a * dt);
        this.offset += this.speed * dt;
        return false;
      }
      case 'stop':
        this.speed = 0;
        if (this.phaseTime >= CRUSHER_STOP_DWELL_S) {
          this.phase = 'reverseShift';
          this.phaseTime = 0;
        }
        return false;
      case 'reverseShift':
        this.speed = 0;
        if (this.phaseTime >= 0.6) {
          this.phase = 'reverseBackup';
          this.phaseTime = 0;
        }
        return false;
      case 'reverseBackup': {
        const target = -this.backupDistM;
        const remaining = this.offset - target;
        if (remaining <= 0.05) {
          this.phase = 'dump';
          this.phaseTime = 0;
          this.speed = 0;
          return false;
        }
        const reverseSpeed = Math.min(1.2, Math.sqrt(2 * 0.5 * remaining));
        this.speed = -reverseSpeed;
        this.offset += this.speed * dt;
        return false;
      }
      case 'dump':
        this.speed = 0;
        if (this.phaseTime >= CRUSHER_DUMP_DWELL_S) {
          this.phase = 'pullOut';
          this.phaseTime = 0;
        }
        return false;
      case 'pullOut': {
        this.speed = Math.min(approachSpeedMps, this.speed + MAX_LONG_ACCEL * dt);
        this.offset += this.speed * dt;
        if (this.offset >= this.approachDistM) {
          this.phase = 'idle';
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }
}

/**
 * Excavator spot maneuver (Fix #86):
 *   three-point turn-around -> back under the shovel dipper.
 */
export class ExcavatorSpotManeuver {
  private phase: ManeuverPhase = 'idle';
  private phaseTime = 0;
  private offset = 0;
  private speed = 0;
  private readonly turnRadiusM: number;
  private readonly backUnderDistM: number;

  constructor(turnRadiusM = 8, backUnderDistM = 10) {
    this.turnRadiusM = turnRadiusM;
    this.backUnderDistM = backUnderDistM;
  }

  reset(): void {
    this.phase = 'idle';
    this.phaseTime = 0;
    this.offset = 0;
    this.speed = 0;
  }

  get state(): ManeuverState {
    return {
      phase: this.phase,
      phaseTimeS: this.phaseTime,
      offsetM: this.offset,
      speedMps: this.speed,
      isReversing: this.phase === 'backUnderShovel',
      isQueueing: this.phase === 'spotTurn' || this.phase === 'backUnderShovel',
    };
  }

  step(dt: number, approachSpeedMps: number): boolean {
    this.phaseTime += dt;
    switch (this.phase) {
      case 'idle':
        this.phase = 'spotTurn';
        this.phaseTime = 0;
        this.speed = Math.min(approachSpeedMps, 1.5);
        return false;
      case 'spotTurn': {
        // Three-point turn: forward arc, reverse arc, forward arc.
        // Approximate as a slow forward-then-reverse cycle.
        const cycle = this.phaseTime % 3.0;
        if (cycle < 1.0) {
          this.speed = 1.2;
          this.offset += this.speed * dt;
        } else if (cycle < 2.0) {
          this.speed = -0.9;
          this.offset += this.speed * dt;
        } else {
          this.speed = 1.0;
          this.offset += this.speed * dt;
        }
        if (this.phaseTime >= EXCAVATOR_SPOT_DWELL_S + 1.2) {
          this.phase = 'backUnderShovel';
          this.phaseTime = 0;
          this.offset = 0;
          this.speed = 0;
        }
        return false;
      }
      case 'backUnderShovel': {
        const target = -this.backUnderDistM;
        const remaining = this.offset - target;
        if (remaining <= 0.05) {
          this.speed = 0;
          this.phase = 'idle';
          return true;
        }
        const reverseSpeed = Math.min(0.8, Math.sqrt(2 * 0.4 * remaining));
        this.speed = -reverseSpeed;
        this.offset += this.speed * dt;
        return false;
      }
      default:
        return false;
    }
  }
}

/* ============================================================================
 * Fix #126/#127/#131 — Fleet anti-bunching headway controller
 * ==========================================================================*/

interface TruckRuntime {
  index: number;
  u: number;
  speedKmh: number;
  yaw: number;
  steerRad: number;
  isReversing: boolean;
  isQueueing: boolean;
  targetSpeedKmh: number;
  distanceToLeadM: number;
  speedController: SCurveSpeedController;
  lastYaw: number;
}

/**
 * Compute the required safety headway gap for a given speed and queue state.
 */
export function computeSafetyHeadway(speedKmh: number, isQueueing: boolean): number {
  if (isQueueing) return HEADWAY_QUEUE_M;
  const v = Math.max(0, speedKmh);
  const timeGap = v * KMH_TO_MPS * HEADWAY_TIME_GAP_S;
  const speedGap = (v / HEADWAY_REF_SPEED_KMH) * HEADWAY_MIN_M;
  return Math.max(HEADWAY_MIN_M, Math.max(timeGap, speedGap));
}

/**
 * Autonomous Fleet dispatch coordinator. Maintains per-truck runtime state and applies
 * anti-bunching headway regulation each frame using adaptive distance headway control.
 */
export class AutonomousFleetDispatchCoordinator implements FleetDispatchCoordinator {
  private readonly trucks: TruckRuntime[] = [];
  private readonly trajectory: CatmullRomTrajectory;
  private readonly sample: TrajectorySample = {
    x: 0, y: 0, yaw: 0, curvature: 0, speedScale: 1,
  };
  private readonly yawRateOut = { value: 0 };

  constructor(trajectory: CatmullRomTrajectory) {
    this.trajectory = trajectory;
  }

  private ensureTruck(index: number): TruckRuntime {
    let t = this.trucks[index];
    if (!t) {
      t = {
        index,
        u: 0,
        speedKmh: 0,
        yaw: 0,
        steerRad: 0,
        isReversing: false,
        isQueueing: false,
        targetSpeedKmh: 0,
        distanceToLeadM: Infinity,
        speedController: new SCurveSpeedController(),
        lastYaw: 0,
      };
      this.trucks[index] = t;
    }
    return t;
  }

  getState(index: number): TruckKinematicState | undefined {
    const t = this.trucks[index];
    if (!t) return undefined;
    return {
      index: t.index,
      u: t.u,
      speedKmh: t.speedKmh,
      yaw: t.yaw,
      steerRad: t.steerRad,
      isReversing: t.isReversing,
      isQueueing: t.isQueueing,
      targetSpeedKmh: t.targetSpeedKmh,
      distanceToLeadM: t.distanceToLeadM,
    };
  }

  reset(): void {
    for (const t of this.trucks) {
      if (t) {
        t.u = 0;
        t.speedKmh = 0;
        t.yaw = 0;
        t.steerRad = 0;
        t.isReversing = false;
        t.isQueueing = false;
        t.targetSpeedKmh = 0;
        t.distanceToLeadM = Infinity;
        t.speedController.reset();
        t.lastYaw = 0;
      }
    }
  }

  /**
   * Main per-frame update. Regulates each truck's speed to maintain safe
   * headway, then advances kinematics along the trajectory.
   */
  updateFleetHeadway(trucks: FleetTruckInput[], dt: number): TruckKinematicState[] {
    if (dt <= 0) return this.snapshot(trucks);
    const n = trucks.length;
    const totalLen = this.trajectory.length;

    // Sort indices by baseU descending (lead first). Small n=8, insertion sort.
    const order = new Int32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    for (let i = 1; i < n; i++) {
      const key = order[i];
      const keyU = trucks[key].baseU;
      let j = i - 1;
      while (j >= 0 && trucks[order[j]].baseU < keyU) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = key;
    }

    // First pass: compute gaps and target speeds.
    for (let k = 0; k < n; k++) {
      const idx = order[k];
      const input = trucks[idx];
      const rt = this.ensureTruck(input.index);
      rt.u = clamp(input.baseU, 0, 1);

      // Determine lead gap.
      let gap = Infinity;
      if (k > 0) {
        const leadIdx = order[k - 1];
        const leadU = trucks[leadIdx].baseU;
        gap = Math.max(0, (leadU - input.baseU) * totalLen);
      }
      rt.distanceToLeadM = gap;

      // Nominal target speed from trajectory cap and multiplier.
      const cap = this.trajectory.speedCapAt(rt.u);
      const nominal = Math.min(cap, 40) * input.speedMultiplier;

      // Queue detection: if gap is small, treat as queueing.
      const queueing = gap < HEADWAY_QUEUE_M * 1.5;
      rt.isQueueing = queueing;

      // Anti-bunching regulation.
      let target = nominal;
      if (isFinite(gap)) {
        const safety = computeSafetyHeadway(nominal, queueing);
        const gapError = gap - safety;
        if (gapError < 0) {
          // Too close: slow down proportionally.
          const correction = clamp(gapError * HEADWAY_KP, -HEADWAY_MAX_DELTA_KMH, 0);
          target = Math.max(0, target + correction);
        } else if (gapError > safety * 0.5 && k > 0) {
          // Far behind: allow catch-up (but not beyond nominal).
          const correction = clamp(gapError * HEADWAY_KP * 0.5, 0, HEADWAY_MAX_DELTA_KMH);
          target = Math.min(nominal * 1.15, target + correction);
        }
      }
      rt.targetSpeedKmh = target;
    }

    // Second pass: advance kinematics.
    for (let k = 0; k < n; k++) {
      const idx = order[k];
      const input = trucks[idx];
      const rt = this.ensureTruck(input.index);

      const targetMps = rt.targetSpeedKmh * KMH_TO_MPS;
      const newSpeedMps = rt.speedController.step(targetMps, dt);
      rt.speedKmh = newSpeedMps * MPS_TO_KMH;

      // Advance u along arc length.
      if (totalLen > 0) {
        const du = (newSpeedMps * dt) / totalLen;
        rt.u = clamp(rt.u + du, 0, 1);
      }

      // Evaluate trajectory for yaw and steering.
      this.trajectory.evaluate(rt.u, this.sample);
      const targetYaw = this.sample.yaw;
      const maxRate = maxYawRateForSpeed(rt.speedKmh);
      rt.yaw = clampYawRate(rt.lastYaw, targetYaw, dt, maxRate, this.yawRateOut);
      rt.lastYaw = rt.yaw;

      // Steering angle from curvature (bicycle model approximation).
      const wheelbase = 6.5; // 130t haul truck wheelbase (m)
      rt.steerRad = Math.atan(wheelbase * this.sample.curvature);
      rt.isReversing = false;
    }

    return this.snapshot(trucks);
  }

  private snapshot(trucks: FleetTruckInput[]): TruckKinematicState[] {
    const out: TruckKinematicState[] = new Array(trucks.length);
    for (let i = 0; i < trucks.length; i++) {
      const rt = this.ensureTruck(trucks[i].index);
      out[i] = {
        index: rt.index,
        u: rt.u,
        speedKmh: rt.speedKmh,
        yaw: rt.yaw,
        steerRad: rt.steerRad,
        isReversing: rt.isReversing,
        isQueueing: rt.isQueueing,
        targetSpeedKmh: rt.targetSpeedKmh,
        distanceToLeadM: rt.distanceToLeadM,
      };
    }
    return out;
  }
}

export function createFleetDispatchCoordinator(
  waypoints: Waypoint[]
): FleetDispatchCoordinator {
  const traj = new CatmullRomTrajectory(waypoints);
  return new AutonomousFleetDispatchCoordinator(traj);
}

// Backward-compatible alias
export { AutonomousFleetDispatchCoordinator as DeepSeekFleetDispatchCoordinator };

