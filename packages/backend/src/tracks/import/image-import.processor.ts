import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job } from "bullmq"
import { runCmd } from "src/util/run-command"
import { MapillaryImageDescription } from "./mapillary-metadata"
import path from "path"
import * as fs from "fs/promises"
import { TracksService } from "../tracks.service"
import { TrackImage } from "../track-image.entity"
import { Inject, forwardRef } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"

export interface ImageImportPayload {
  trackId: number
}

export const IMAGE_IMPORT_QUEUE = "image-import"

@Processor("image-import")
export class ImageImportProcessor extends WorkerHost {
  constructor(
    @Inject(forwardRef(() => TracksService))
    private readonly tracksService: TracksService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super()
  }

  async process(job: Job<ImageImportPayload>): Promise<any> {
    const trackId = job.data.trackId
    const track = await this.tracksService.get(trackId)
    const videoPath = track.filePath

    const outDir = path.join(
      path.dirname(videoPath),
      path.basename(videoPath, path.extname(videoPath)),
    )

    await this.extractFrames(videoPath, outDir)

    const imageDescriptions = await this.extractFrames(videoPath, outDir)
    const images = imageDescriptions.map(
      (imageDescription, index): Partial<TrackImage> => ({
        sequenceNumber: index,
        captureDate: this.parseMapillaryDate(imageDescription.MAPCaptureTime),
        filePath: imageDescription.filename,
        location: {
          type: "Point",
          coordinates: [
            imageDescription.MAPLongitude,
            imageDescription.MAPLatitude,
          ],
        },
        heading: imageDescription.MAPCompassHeading?.TrueHeading,
        track,
      }),
    )

    await this.tracksService.createImages(images)

    this.eventEmitter.emit("track.imagesImported", {
      id: track.id,
      name: track.name,
      imageCount: images.length,
    })
  }

  private parseMapillaryDate(date: string): Date {
    const iso = date.replace(
      /(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{3})/,
      "$1-$2-$3T$4:$5:$6.$7",
    )

    return new Date(iso)
  }

  private async extractFrames(
    videoPath: string,
    outDir: string,
  ): Promise<MapillaryImageDescription[]> {
    await runCmd("mapillary_tools", [
      "video_process",
      "--video_sample_distance",
      "10",
      videoPath,
      outDir,
    ])

    const imageDescriptionPath = path.join(
      outDir,
      "mapillary_image_description.json",
    )

    const imageDescriptions = await fs.readFile(imageDescriptionPath, "utf-8")
    return JSON.parse(imageDescriptions)
  }
}
