import bearing from "@turf/bearing"
import distance from "@turf/distance"
import { GpsSample } from "../gpmf/gps"
import { smoothTrackSegments } from "../tracks/import/gpx-smooth"
import { TrackPoint, TrackSegment } from "../vendor/gpx"

export interface FramePosition {
  /** Index of the frame in presentation order */
  frameIndex: number
  videoTime: number
  time: Date
  latitude: number
  longitude: number
  altitude: number
  heading?: number
}

export interface FrameSamplingOptions {
  /** Minimum distance in meters between selected frames */
  sampleDistance?: number
  /** Heading is the bearing between positions this many seconds before and after the frame */
  headingWindow?: number
  /** Below this distance in meters across the heading window, the previous heading is kept */
  minHeadingDistance?: number
}

/** Splits GPS samples into continuous segments with noise and stationary jitter removed. */
export function segmentGpsSamples(samples: GpsSample[]): GpsSample[][] {
  const segment = new TrackSegment({
    trkpt: samples.map((sample) => ({
      attributes: { lat: sample.latitude, lon: sample.longitude },
      ele: sample.altitude,
      time: sample.time,
      _data: { sample },
    })),
  })

  return smoothTrackSegments(segment).map((smoothed) =>
    smoothed.trkpt.map((point: TrackPoint) => point._data.sample),
  )
}

/** Picks frames along the GPS segments so that consecutive frames are at least sampleDistance apart. */
export function sampleFramesByDistance(
  segments: GpsSample[][],
  frameTimes: number[],
  {
    sampleDistance = 10,
    headingWindow = 1,
    minHeadingDistance = 1,
  }: FrameSamplingOptions = {},
): FramePosition[] {
  const selected: FramePosition[] = []
  let previousHeading: number | undefined

  frameTimes.forEach((videoTime, frameIndex) => {
    const segment = segments.find(
      (seg) =>
        seg[0].videoTime <= videoTime && videoTime <= seg.at(-1).videoTime,
    )
    if (!segment) return

    const position = interpolate(segment, videoTime)
    const last = selected.at(-1)
    if (last && distanceBetween(last, position) <= sampleDistance) return

    const before = interpolate(segment, videoTime - headingWindow)
    const after = interpolate(segment, videoTime + headingWindow)
    if (distanceBetween(before, after) >= minHeadingDistance) {
      previousHeading = bearingBetween(before, after)
    }

    selected.push({ frameIndex, ...position, heading: previousHeading })
  })

  return selected
}

function interpolate(segment: GpsSample[], videoTime: number) {
  const clamped = Math.min(
    Math.max(videoTime, segment[0].videoTime),
    segment.at(-1).videoTime,
  )

  const endIndex = Math.max(
    1,
    segment.findIndex((sample) => sample.videoTime >= clamped),
  )
  const start = segment[endIndex - 1] ?? segment[0]
  const end = segment[endIndex] ?? start
  const span = end.videoTime - start.videoTime
  const weight = span > 0 ? (clamped - start.videoTime) / span : 0
  const lerp = (a: number, b: number) => a + (b - a) * weight

  return {
    videoTime,
    time: new Date(lerp(start.time.getTime(), end.time.getTime())),
    latitude: lerp(start.latitude, end.latitude),
    longitude: lerp(start.longitude, end.longitude),
    altitude: lerp(start.altitude, end.altitude),
  }
}

type LatLon = { latitude: number; longitude: number }

const toCoord = ({ latitude, longitude }: LatLon) => [longitude, latitude]

function distanceBetween(a: LatLon, b: LatLon): number {
  return distance(toCoord(a), toCoord(b), { units: "meters" })
}

function bearingBetween(from: LatLon, to: LatLon): number {
  return (bearing(toCoord(from), toCoord(to)) + 360) % 360
}
