import type { WriteTags } from "exiftool-vendored"
import { FramePosition } from "./frame-sampling"
import { PANORAMA_HEIGHT, PANORAMA_WIDTH } from "./frame-extraction"

export function buildTags(
  frame: FramePosition,
  cameraModel: string,
): WriteTags {
  const iso = frame.time.toISOString()
  const [date, time] = [iso.slice(0, 10), iso.slice(11, 19)]
  const exifDate = date.replaceAll("-", ":")

  const tags: Record<string, string | number | boolean> = {
    Make: "GoPro",
    Model: cameraModel,
    DateTimeOriginal: `${exifDate} ${time}`,
    SubSecTimeOriginal: iso.slice(20, 23),
    OffsetTimeOriginal: "+00:00",
    GPSDateStamp: exifDate,
    GPSTimeStamp: iso.slice(11, 23),
    GPSLatitude: frame.latitude,
    GPSLongitude: frame.longitude,
    GPSAltitude: frame.altitude,
    "XMP-GPano:ProjectionType": "equirectangular",
    "XMP-GPano:UsePanoramaViewer": true,
    "XMP-GPano:FullPanoWidthPixels": PANORAMA_WIDTH,
    "XMP-GPano:FullPanoHeightPixels": PANORAMA_HEIGHT,
    "XMP-GPano:CroppedAreaImageWidthPixels": PANORAMA_WIDTH,
    "XMP-GPano:CroppedAreaImageHeightPixels": PANORAMA_HEIGHT,
    "XMP-GPano:CroppedAreaLeftPixels": 0,
    "XMP-GPano:CroppedAreaTopPixels": 0,
  }

  if (frame.heading !== undefined) {
    tags.GPSImgDirection = frame.heading
    tags.GPSImgDirectionRef = "T"
    tags["XMP-GPano:PoseHeadingDegrees"] = frame.heading
  }

  return tags as WriteTags
}
