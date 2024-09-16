import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq"
import { TracksService } from "./tracks.service"
import { Job, UnrecoverableError } from "bullmq"
import { Feature, LineString } from "typeorm"
import { execFile } from "child_process"
import { parseGPX, ramerDouglasPeucker } from "src/vendor/gpx"
import { createReadStream } from "fs"
import * as crypto from "crypto"
import * as fs from "fs/promises"
import * as path from "path"
import { forwardRef, Inject } from "@nestjs/common"
import { smoothTrackSegment } from "src/tracks/gpx-smooth"
import { EventEmitter2 } from "@nestjs/event-emitter"

export interface TrackImportPayload {
  filePath: string
  force?: boolean
}

export const TRACK_IMPORT_QUEUE = "track-import"

@Processor(TRACK_IMPORT_QUEUE)
export class TrackImportProcessor extends WorkerHost {
  constructor(
    @Inject(forwardRef(() => TracksService))
    private readonly tracksService: TracksService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super()
  }

  @OnWorkerEvent("failed")
  onFailure(job: Job<TrackImportPayload>, error: Error) {
    this.eventEmitter.emit("track.importFailure", {
      filePath: job.data.filePath,
      error: error.message,
    })
  }

  async process(job: Job<TrackImportPayload>): Promise<any> {
    await job.updateProgress({
      status: "Obtaining file hash",
    })

    const hash = await this.getFileHash(job.data.filePath)

    if (!job.data.force) {
      const alreadyExists = await this.tracksService.existsByFileHash(hash)
      if (alreadyExists) {
        throw new UnrecoverableError("File has already been processed")
      }
    }

    await job.updateProgress({
      status: "Processing GPX data",
    })

    let gpxData: Feature
    try {
      const gpxPath = await this.convertToGpx(job.data.filePath, job)
      gpxData = await this.processGpxData(gpxPath)
    } catch (e: any) {
      throw new UnrecoverableError(`Failed to process GPX data: ${e.message}`)
    }

    await job.updateProgress({
      status: "Extracting capture date",
    })

    const captureDate = await this.getCaptureDate(job.data.filePath)

    await job.updateProgress({
      status: "Finalizing import",
    })

    const track = await this.tracksService.upsert({
      name: path.basename(job.data.filePath),
      captureDate,
      filePath: job.data.filePath,
      fileHash: hash,
      geometry: gpxData.geometry as LineString,
    })

    this.eventEmitter.emit("track.imported", {
      id: track.id,
      name: track.name,
    })

    return {
      id: track.id,
    }
  }

  private async convertToGpx(filePath: string, job: Job): Promise<string> {
    const { stdout, stderr } = await this.runCmd("gopro2gpx", [
      "--skip-dop",
      "--dop-limit",
      "500",
      "-s",
      filePath,
      filePath,
    ])

    await job.log(
      `gopro2gpx stdout:\n${stdout}\n\ngopro2gpx stderr:\n${stderr}`,
    )

    const lastLine = stdout.trim().split("\n").pop()
    if (lastLine.startsWith("Can't create file")) {
      throw new Error(`Could not convert to GPX: ${lastLine}`)
    }

    return `${filePath}.gpx`
  }

  private async processGpxData(gpxPath: string): Promise<Feature> {
    const gpxFile = await fs.readFile(gpxPath, "utf-8")

    const gpxData = parseGPX(gpxFile)

    const segment = gpxData.getSegment(0, 0)
    const smoothedSegment = smoothTrackSegment(segment)

    const simplifiedPoints = ramerDouglasPeucker(smoothedSegment.trkpt, 1)
    const points = simplifiedPoints.filter(
      (point) => point.distance === undefined || point.distance >= 1,
    )

    if (points.length < 5) {
      throw new Error("Cleaned GPX yielded insignificant data")
    }

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: points.map((point) => [
          point.point.getLongitude(),
          point.point.getLatitude(),
        ]),
      },
    }
  }

  private async getCaptureDate(filePath: string): Promise<Date> {
    const { stdout } = await this.runCmd("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      filePath,
    ])

    const data = JSON.parse(stdout)
    if (data.format?.tags?.creation_time) {
      const creationTime = data.format.tags.creation_time as string
      return new Date(creationTime.replace("Z", ""))
    }

    const { birthtime } = await fs.stat(filePath)
    return birthtime
  }

  private runCmd(command: string, args: string[] = []) {
    return new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      },
    )
  }

  private getFileHash(filePath: string): Promise<string> {
    const fd = createReadStream(filePath)
    const hash = crypto.createHash("sha256")
    hash.setEncoding("hex")

    const promise = new Promise<string>((resolve, reject) => {
      fd.once("end", () => {
        hash.end()
        resolve(hash.read())
      })

      fd.once("error", reject)
    })

    fd.pipe(hash)
    return promise
  }
}
