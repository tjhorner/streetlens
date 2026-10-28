import { GpmfEntry, readDate, readNumbers, streams } from "./klv"
import { GpmfPacket } from "./telemetry"

export interface GpsSample {
  /** Seconds from the start of the video */
  videoTime: number
  time: Date
  latitude: number
  longitude: number
  altitude: number
  speed: number
}

export interface GpsFilterOptions {
  /** Drop samples whose dilution of precision (GPSP, DOP × 100) is above this */
  maxDop?: number
}

const NO_FIX = 0

export function extractGpsSamples(
  packets: GpmfPacket[],
  { maxDop = 1000 }: GpsFilterOptions = {},
): GpsSample[] {
  const samples: GpsSample[] = []
  let awaitingFreshPosition = true

  for (const packet of packets) {
    for (const stream of streams(packet.entries)) {
      const gps5 = find(stream, "GPS5")
      if (!gps5) continue

      const fix = valueOf(find(stream, "GPSF"))
      const dop = valueOf(find(stream, "GPSP"))
      const utcStart = readDate(find(stream, "GPSU"))
      if (fix === NO_FIX || (dop !== undefined && dop > maxDop) || !utcStart) {
        awaitingFreshPosition = true
        continue
      }

      const scale = readNumbers(find(stream, "SCAL")).map(([value]) => value)
      const rows = readNumbers(gps5)
      const interval = packet.duration / rows.length

      rows.forEach((row, index) => {
        const [latitude, longitude, altitude, speed] = row.map(
          (value, i) => value / (scale[i] ?? scale[0]),
        )
        if (latitude === 0 && longitude === 0 && altitude === 0) return
        if (awaitingFreshPosition && speed === 0) return
        awaitingFreshPosition = false

        samples.push({
          videoTime: packet.time + index * interval,
          time: new Date(utcStart.getTime() + index * interval * 1000),
          latitude,
          longitude,
          altitude,
          speed,
        })
      })
    }
  }

  return samples
}

function find(stream: GpmfEntry[], key: string) {
  return stream.find((entry) => entry.key === key)
}

function valueOf(entry: GpmfEntry | undefined): number | undefined {
  return entry ? readNumbers(entry)[0][0] : undefined
}
