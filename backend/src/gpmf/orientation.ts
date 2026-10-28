import { readNumbers, streams } from "./klv"
import { GpmfPacket } from "./telemetry"

export type Vector3 = [number, number, number]
export type Quaternion = [number, number, number, number]

export interface OrientationSample {
  /** Seconds from the start of the video */
  videoTime: number
  /** Direction of gravity in camera coordinates (GRAV), unit length */
  gravity: Vector3
  /** Camera orientation since the start of the recording (CORI) as w, x, y, z */
  orientation: Quaternion
}

/** Reads GRAV and CORI, which the GoPro MAX records at the video frame rate. */
export function extractOrientationSamples(
  packets: GpmfPacket[],
): OrientationSample[] {
  const samples: OrientationSample[] = []

  for (const packet of packets) {
    let gravity: number[][] = []
    let orientation: number[][] = []

    for (const stream of streams(packet.entries)) {
      const scale = stream.find((entry) => entry.key === "SCAL")
      const divisor = scale ? readNumbers(scale)[0][0] : 1
      const scaled = (key: string) => {
        const entry = stream.find((e) => e.key === key)
        return entry
          ? readNumbers(entry).map((row) => row.map((v) => v / divisor))
          : undefined
      }

      gravity = scaled("GRAV") ?? gravity
      orientation = scaled("CORI") ?? orientation
    }

    const count = Math.min(gravity.length, orientation.length)
    for (let i = 0; i < count; i++) {
      samples.push({
        videoTime: packet.time + (i * packet.duration) / count,
        gravity: normalize(gravity[i] as Vector3),
        orientation: orientation[i] as Quaternion,
      })
    }
  }

  return samples
}

function normalize([x, y, z]: Vector3): Vector3 {
  const length = Math.hypot(x, y, z) || 1
  return [x / length, y / length, z / length]
}
