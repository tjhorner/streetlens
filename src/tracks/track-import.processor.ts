import { Processor, WorkerHost } from "@nestjs/bullmq"
import { TracksService } from "./tracks.service"
import { Job, UnrecoverableError } from "bullmq"
import { FeatureCollection, LineString } from "typeorm"
import { execFile } from "child_process"
import { parseGPX } from "src/vendor/gpx"
import { createReadStream } from "fs"
import * as crypto from "crypto"
import * as fs from "fs/promises"
import * as path from "path"
import { forwardRef, Inject } from "@nestjs/common"

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
  ) {
    super()
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

    let gpxData: FeatureCollection
    try {
      const gpxPath = await this.convertToGpx(job.data.filePath)
      gpxData = await this.getGpxData(gpxPath)
    } catch {
      throw new UnrecoverableError("Failed to process GPX data")
    }

    const trackFeature = gpxData.features.find(
      (feat) => feat.geometry.type === "LineString",
    )
    if (!trackFeature) {
      throw new UnrecoverableError("No track found in GPX file")
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
      geometry: trackFeature.geometry as LineString,
    })

    return {
      id: track.id,
    }
  }

  private async convertToGpx(filePath: string): Promise<string> {
    await this.runCmd("gopro2gpx", [
      "--skip-dop",
      "--dop-limit",
      "500",
      "-s",
      filePath,
      filePath,
    ])

    return `${filePath}.gpx`
  }

  private async getGpxData(gpxPath): Promise<FeatureCollection> {
    const gpxFile = await fs.readFile(gpxPath, "utf-8")

    const gpxData = parseGPX(gpxFile)
    const featureCollection = gpxData.toGeoJSON()

    return featureCollection
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
