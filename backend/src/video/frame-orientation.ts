import { OrientationSample, Quaternion, Vector3 } from "../gpmf/orientation"

export interface FrameRotation {
  /** Degrees, in the order v360 applies them with rorder=rpy: roll, then pitch, then yaw */
  yaw: number
  pitch: number
  roll: number
}

export interface FrameForRotation {
  videoTime: number
  /** Direction of travel in degrees */
  heading?: number
}

export interface RotationOptions {
  /**
   * The camera's usual yaw relative to the direction of travel is the median over this many
   * seconds on either side, which ignores brief head turns and follows slow gyro drift.
   */
  baselineWindowSeconds?: number
}

const NO_ROTATION: FrameRotation = { yaw: 0, pitch: 0, roll: 0 }

/**
 * Rotations that level each frame using gravity and turn it to face the direction of travel.
 *
 * In GoPro MAX camera coordinates, y points down when the camera is level, z is the
 * front-back axis and x is the side axis.
 */
export function computeFrameRotations(
  frames: FrameForRotation[],
  samples: OrientationSample[],
  { baselineWindowSeconds = 30 }: RotationOptions = {},
): FrameRotation[] {
  if (samples.length === 0) return frames.map(() => NO_ROTATION)

  const frameSamples = frames.map((frame) =>
    nearestSample(samples, frame.videoTime),
  )

  const yawOffsets = frames.map((frame, i) =>
    frame.heading === undefined
      ? undefined
      : wrapDegrees(frame.heading - cameraYaw(frameSamples[i])),
  )

  return frames.map((frame, i) => {
    const [gx, , gz] = frameSamples[i].gravity
    const pitch = toDegrees(Math.asin(gz))
    const roll = -toDegrees(Math.asin(gx))

    const offset = yawOffsets[i]
    if (offset === undefined) return { yaw: 0, pitch, roll }

    const nearbyOffsets = frames
      .map((other, j) => ({ other, offset: yawOffsets[j] }))
      .filter(
        ({ other, offset }) =>
          offset !== undefined &&
          Math.abs(other.videoTime - frame.videoTime) <= baselineWindowSeconds,
      )
      .map(({ offset }) => offset)

    return {
      yaw: wrapDegrees(offset - circularMedian(nearbyOffsets)),
      pitch,
      roll,
    }
  })
}

/**
 * Heading of the camera's front axis in the recording's starting frame of reference,
 * measured around the current gravity direction. Only differences between frames are meaningful.
 */
function cameraYaw({ gravity, orientation }: OrientationSample): number {
  const down = normalize(rotate(orientation, gravity))
  const front = rotate(orientation, [0, 0, 1])
  const frontLevel = normalize(subtract(front, scale(down, dot(front, down))))

  const reference = normalize(subtract([1, 0, 0], scale(down, down[0])))
  const side = cross(down, reference)

  return toDegrees(
    Math.atan2(dot(frontLevel, side), dot(frontLevel, reference)),
  )
}

/** Rotates a camera-frame vector into the starting frame (CORI is applied as its conjugate). */
function rotate([w, x, y, z]: Quaternion, v: Vector3): Vector3 {
  const length = Math.hypot(w, x, y, z) || 1
  const q: Vector3 = [-x / length, -y / length, -z / length]
  const qw = w / length

  const t = scale(cross(q, v), 2)
  return add(add(v, scale(t, qw)), cross(q, t))
}

function nearestSample(samples: OrientationSample[], videoTime: number) {
  let low = 0
  let high = samples.length - 1
  while (low < high) {
    const mid = (low + high) >> 1
    if (samples[mid].videoTime < videoTime) low = mid + 1
    else high = mid
  }

  const before = samples[Math.max(0, low - 1)]
  const after = samples[low]
  return Math.abs(before.videoTime - videoTime) <
    Math.abs(after.videoTime - videoTime)
    ? before
    : after
}

/** Median of angles, taken relative to their circular mean so values near ±180 work. */
function circularMedian(angles: number[]): number {
  const mean = toDegrees(
    Math.atan2(
      angles.reduce((sum, a) => sum + Math.sin(toRadians(a)), 0),
      angles.reduce((sum, a) => sum + Math.cos(toRadians(a)), 0),
    ),
  )

  const relative = angles
    .map((angle) => wrapDegrees(angle - mean))
    .sort((a, b) => a - b)
  const middle = relative.length >> 1
  const median =
    relative.length % 2
      ? relative[middle]
      : (relative[middle - 1] + relative[middle]) / 2

  return wrapDegrees(mean + median)
}

function wrapDegrees(angle: number) {
  return ((((angle + 180) % 360) + 360) % 360) - 180
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI
const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const add = (a: Vector3, b: Vector3): Vector3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
]
const subtract = (a: Vector3, b: Vector3): Vector3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]
const scale = (v: Vector3, s: number): Vector3 => [v[0] * s, v[1] * s, v[2] * s]
const dot = (a: Vector3, b: Vector3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vector3, b: Vector3): Vector3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (v: Vector3): Vector3 => scale(v, 1 / (Math.hypot(...v) || 1))
