// Import necessary classes (adjust the import path as needed)
import { TrackSegment, TrackPoint } from "../../vendor/gpx" // or the appropriate module path

/**
 * Smooths a GPX track segment by removing or correcting improbable points caused by unreliable GPS data.
 * @param trackSegment - The original TrackSegment to be smoothed.
 * @returns A new TrackSegment with smoothed TrackPoints.
 */
export function smoothTrackSegment(trackSegment: TrackSegment): TrackSegment {
  const maxSpeedThreshold = 17.8 // meters per second (adjust based on expected activity speed)

  const originalTrackPoints = trackSegment.trkpt
  const cleanedTrackPoints: TrackPoint[] = []

  let previousValidPoint: TrackPoint | null = null
  let invalidPoints: TrackPoint[] = []

  for (let i = 0; i < originalTrackPoints.length; i++) {
    const currentPoint = originalTrackPoints[i]
    let isValid = true

    if (previousValidPoint) {
      // Calculate distance and time difference
      const distance = calculateDistance(previousValidPoint, currentPoint)
      const timeDiff = calculateTimeDifference(previousValidPoint, currentPoint)

      // Handle missing timestamps or zero/negative time differences
      if (isNaN(timeDiff) || timeDiff <= 0) {
        isValid = false
      } else {
        // Calculate speed
        const speed = distance / timeDiff // meters per second

        // Flag point as invalid if speed exceeds threshold
        if (speed > maxSpeedThreshold) {
          isValid = false
        }
      }
    }

    if (isValid) {
      if (invalidPoints.length > 0) {
        if (previousValidPoint) {
          const nextValidPoint = currentPoint
          const numInterpolatedPoints = invalidPoints.length

          // Interpolate over invalid points
          const interpolatedPoints = interpolatePointsBetween(
            previousValidPoint,
            nextValidPoint,
            numInterpolatedPoints,
          )

          // Add interpolated points to the cleaned track
          for (const interpolatedPoint of interpolatedPoints) {
            cleanedTrackPoints.push(interpolatedPoint)
          }
        }
        invalidPoints = []
      }
      cleanedTrackPoints.push(currentPoint)
      previousValidPoint = currentPoint
    } else {
      invalidPoints.push(currentPoint)
      // Do not update previousValidPoint
    }
  }

  // Handle remaining invalid points at the end of the track
  if (invalidPoints.length > 0 && previousValidPoint) {
    // Optionally, duplicate the last valid point or discard invalid points
    // For now, we'll discard the invalid points
  }

  // Create a new TrackSegment with the cleaned and smoothed points
  const cleanedTrackSegment = new TrackSegment()
  cleanedTrackSegment.trkpt = cleanedTrackPoints

  return cleanedTrackSegment
}

/**
 * Calculates the distance between two TrackPoints using the Haversine formula.
 * @param pointA - The first TrackPoint.
 * @param pointB - The second TrackPoint.
 * @returns The distance in meters.
 */
function calculateDistance(pointA: TrackPoint, pointB: TrackPoint): number {
  const lat1 = pointA.getLatitude() * (Math.PI / 180)
  const lon1 = pointA.getLongitude() * (Math.PI / 180)
  const lat2 = pointB.getLatitude() * (Math.PI / 180)
  const lon2 = pointB.getLongitude() * (Math.PI / 180)

  const dLat = lat2 - lat1
  const dLon = lon2 - lon1

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const earthRadius = 6371000 // Earth radius in meters

  return earthRadius * c
}

/**
 * Calculates the time difference between two TrackPoints.
 * @param pointA - The first TrackPoint.
 * @param pointB - The second TrackPoint.
 * @returns The time difference in seconds.
 */
function calculateTimeDifference(
  pointA: TrackPoint,
  pointB: TrackPoint,
): number {
  if (pointA.time && pointB.time) {
    return (pointB.time.getTime() - pointA.time.getTime()) / 1000 // Convert milliseconds to seconds
  }
  return NaN
}

/**
 * Interpolates a set of TrackPoints between two valid TrackPoints.
 * @param startPoint - The starting valid TrackPoint.
 * @param endPoint - The ending valid TrackPoint.
 * @param numInterpolatedPoints - The number of points to interpolate.
 * @returns An array of interpolated TrackPoints.
 */
function interpolatePointsBetween(
  startPoint: TrackPoint,
  endPoint: TrackPoint,
  numInterpolatedPoints: number,
): TrackPoint[] {
  const interpolatedPoints: TrackPoint[] = []

  for (let i = 1; i <= numInterpolatedPoints; i++) {
    const fraction = i / (numInterpolatedPoints + 1)

    const lat =
      startPoint.getLatitude() +
      fraction * (endPoint.getLatitude() - startPoint.getLatitude())
    const lon =
      startPoint.getLongitude() +
      fraction * (endPoint.getLongitude() - startPoint.getLongitude())
    const ele =
      startPoint.ele !== undefined && endPoint.ele !== undefined
        ? startPoint.ele + fraction * (endPoint.ele - startPoint.ele)
        : undefined
    const time =
      startPoint.time && endPoint.time
        ? new Date(
            startPoint.time.getTime() +
              fraction * (endPoint.time.getTime() - startPoint.time.getTime()),
          )
        : undefined

    const interpolatedPoint = new TrackPoint({
      attributes: { lat, lon },
      ele,
      time,
    })

    interpolatedPoints.push(interpolatedPoint)
  }

  return interpolatedPoints
}
