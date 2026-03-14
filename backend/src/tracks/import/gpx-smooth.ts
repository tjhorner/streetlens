import { TrackSegment, TrackPoint } from "../../vendor/gpx"

export interface SmoothOptions {
  maxSpeed?: number
  maxDistance?: number
  minAngle?: number
  maxConsecutiveDrops?: number
  minPoints?: number
  minSegmentLength?: number
  maxStationaryRadius?: number
  mergeDistance?: number
  mergeMaxGap?: number
}

const DEFAULT_OPTIONS: Required<SmoothOptions> = {
  maxSpeed: 17.8,
  maxDistance: 200,
  minAngle: 30,
  maxConsecutiveDrops: 10,
  minPoints: 5,
  minSegmentLength: 50,
  maxStationaryRadius: 50,
  mergeDistance: 100,
  mergeMaxGap: 30,
}

export function smoothTrackSegment(
  trackSegment: TrackSegment,
  options?: SmoothOptions,
): TrackSegment {
  const segments = smoothTrackSegments(trackSegment, options)
  return segments.reduce((longest, seg) =>
    seg.trkpt.length > longest.trkpt.length ? seg : longest,
  )
}

export function smoothTrackSegments(
  trackSegment: TrackSegment,
  options?: SmoothOptions,
): TrackSegment[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const original = trackSegment.trkpt

  if (original.length < 3) {
    const seg = new TrackSegment()
    seg.trkpt = [...original]
    return [seg]
  }

  const segments: TrackPoint[][] = []
  let currentSegment: TrackPoint[] = [original[0]]
  let consecutiveDrops = 0

  for (let i = 1; i < original.length; i++) {
    const current = original[i]
    const prev = currentSegment[currentSegment.length - 1]

    if (!isPointValid(prev, currentSegment, current, opts)) {
      consecutiveDrops++

      if (consecutiveDrops >= opts.maxConsecutiveDrops) {
        const distToPrev = calculateDistance(prev, current)
        const timeSincePrev = calculateTimeDifference(prev, current)
        const isTemporallyClose =
          isNaN(timeSincePrev) ||
          (timeSincePrev >= 0 && timeSincePrev <= opts.mergeMaxGap)

        if (distToPrev <= opts.mergeDistance && isTemporallyClose) {
          currentSegment.push(current)
        } else {
          segments.push(currentSegment)
          currentSegment = [current]
        }
        consecutiveDrops = 0
      }

      continue
    }

    currentSegment.push(current)
    consecutiveDrops = 0
  }

  segments.push(currentSegment)

  return segments
    .map((pts) => {
      const seg = new TrackSegment()
      seg.trkpt = pts
      return seg
    })
    .filter((seg) => isViableSegment(seg, opts))
}

function isPointValid(
  prev: TrackPoint,
  currentSegment: TrackPoint[],
  current: TrackPoint,
  opts: Required<SmoothOptions>,
): boolean {
  const distance = calculateDistance(prev, current)
  if (distance > opts.maxDistance) return false

  const timeDiff = calculateTimeDifference(prev, current)
  if (!isNaN(timeDiff) && timeDiff > 0) {
    if (distance / timeDiff > opts.maxSpeed) return false
  }

  if (currentSegment.length >= 2) {
    const prevPrev = currentSegment[currentSegment.length - 2]
    if (calculateAngle(prevPrev, prev, current) < opts.minAngle) return false
  }

  return true
}

function isViableSegment(
  seg: TrackSegment,
  opts: Required<SmoothOptions>,
): boolean {
  const pts = seg.trkpt
  if (pts.length < opts.minPoints) return false

  let totalLength = 0
  for (let i = 1; i < pts.length; i++) {
    totalLength += calculateDistance(pts[i - 1], pts[i])
    if (totalLength >= opts.minSegmentLength) break
  }
  if (totalLength < opts.minSegmentLength) return false

  const centroidLat =
    pts.reduce((sum, p) => sum + p.getLatitude(), 0) / pts.length
  const centroidLon =
    pts.reduce((sum, p) => sum + p.getLongitude(), 0) / pts.length
  const centroid = {
    getLatitude: () => centroidLat,
    getLongitude: () => centroidLon,
  } as TrackPoint

  const maxDistFromCentroid = Math.max(
    ...pts.map((p) => calculateDistance(centroid, p)),
  )
  return maxDistFromCentroid >= opts.maxStationaryRadius
}

function calculateDistance(a: TrackPoint, b: TrackPoint): number {
  const lat1 = a.getLatitude() * (Math.PI / 180)
  const lon1 = a.getLongitude() * (Math.PI / 180)
  const lat2 = b.getLatitude() * (Math.PI / 180)
  const lon2 = b.getLongitude() * (Math.PI / 180)

  const dLat = lat2 - lat1
  const dLon = lon2 - lon1

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function calculateTimeDifference(a: TrackPoint, b: TrackPoint): number {
  if (a.time && b.time) {
    return (b.time.getTime() - a.time.getTime()) / 1000
  }
  return NaN
}

function calculateAngle(a: TrackPoint, b: TrackPoint, c: TrackPoint): number {
  const ax = a.getLongitude() - b.getLongitude()
  const ay = a.getLatitude() - b.getLatitude()
  const cx = c.getLongitude() - b.getLongitude()
  const cy = c.getLatitude() - b.getLatitude()

  const dot = ax * cx + ay * cy
  const cross = ax * cy - ay * cx
  return Math.atan2(Math.abs(cross), dot) * (180 / Math.PI)
}
