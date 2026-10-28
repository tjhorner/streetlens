import { ExifTool } from "exiftool-vendored"
import { FramePosition } from "./frame-sampling"
import { buildTags } from "./image-tags"

export interface ImageToTag {
  path: string
  frame: FramePosition
}

/**
 * Writes EXIF location, time, heading and camera tags, plus XMP GPano tags so
 * 360-aware apps show the image as an equirectangular panorama facing the heading.
 */
export async function writeImageMetadata(
  images: ImageToTag[],
  cameraModel = "GoPro Max",
): Promise<void> {
  const exiftool = new ExifTool()

  try {
    for (const { path, frame } of images) {
      await exiftool.write(path, buildTags(frame, cameraModel), {
        writeArgs: ["-overwrite_original"],
      })
    }
  } finally {
    await exiftool.end()
  }
}
