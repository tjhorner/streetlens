import { Processor, WorkerHost } from "@nestjs/bullmq"
import { Job, UnrecoverableError } from "bullmq"
import path from "path"
import * as fs from "fs/promises"
import { TracksService } from "../../tracks.service"
import { TrackImage } from "../track-image.entity"
import { Inject, forwardRef } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { IMAGE_IMPORT_QUEUE } from "src/tracks/queues.constants"
import { readGpmfPackets } from "src/gpmf/telemetry"
import { extractGpsSamples } from "src/gpmf/gps"
import {
  FramePosition,
  sampleFramesByDistance,
  segmentGpsSamples,
} from "src/video/frame-sampling"
import {
  extractEquirectangularFrames,
  readFrameTimes,
} from "src/video/frame-extraction"

export interface ImageImportPayload {
  trackId: number
}

@Processor(IMAGE_IMPORT_QUEUE)
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

    const framesDir = path.join(
      path.dirname(videoPath),
      path.basename(videoPath, path.extname(videoPath)),
      "frames",
    )

    const frames = await this.selectFrames(videoPath, job)
    const imagePaths = await this.extractFrames(videoPath, framesDir, frames)

    const images = frames.map(
      (frame, index): Partial<TrackImage> => ({
        sequenceNumber: index,
        captureDate: frame.time,
        filePath: imagePaths[index],
        location: {
          type: "Point",
          coordinates: [frame.longitude, frame.latitude],
        },
        heading: frame.heading,
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

  private async selectFrames(
    videoPath: string,
    job: Job<ImageImportPayload>,
  ): Promise<FramePosition[]> {
    const samples = extractGpsSamples(await readGpmfPackets(videoPath))
    const segments = segmentGpsSamples(samples)
    const frameTimes = await readFrameTimes(videoPath)
    const frames = sampleFramesByDistance(segments, frameTimes)

    await job.log(
      `Selected ${frames.length} of ${frameTimes.length} frames from ${segments.length} GPS segments`,
    )

    if (frames.length === 0) {
      throw new UnrecoverableError("No frames with usable GPS data")
    }

    return frames
  }

  private async extractFrames(
    videoPath: string,
    framesDir: string,
    frames: FramePosition[],
  ): Promise<string[]> {
    const wipDir = `${framesDir}.wip`
    await fs.rm(wipDir, { recursive: true, force: true })

    try {
      const wipPaths = await extractEquirectangularFrames(
        videoPath,
        wipDir,
        frames,
      )

      await fs.rm(framesDir, { recursive: true, force: true })
      await fs.rename(wipDir, framesDir)

      return wipPaths.map((wipPath) =>
        path.join(framesDir, path.basename(wipPath)),
      )
    } finally {
      await fs.rm(wipDir, { recursive: true, force: true })
    }
  }
}
