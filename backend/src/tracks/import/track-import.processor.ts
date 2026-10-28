import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq"
import { TracksService } from "../tracks.service"
import { Job, UnrecoverableError } from "bullmq"
import { Feature, MultiLineString } from "typeorm"
import { buildGPX, GPXFile, ramerDouglasPeucker } from "src/vendor/gpx"
import { createReadStream } from "fs"
import * as crypto from "crypto"
import * as fs from "fs/promises"
import * as path from "path"
import { forwardRef, Inject } from "@nestjs/common"
import { smoothTrackSegments } from "./gpx-smooth"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { runCmd } from "src/util/run-command"
import { readGpmfPackets } from "src/gpmf/telemetry"
import { extractGpsSamples } from "src/gpmf/gps"
import { TRACK_IMPORT_QUEUE } from "../queues.constants"
import { PROCESSOR_VERSION } from "../processor-version"
import { removeLegacyTrackOutputs } from "../legacy-outputs"

export interface TrackImportPayload {
  filePath: string
  force?: boolean
}

@Processor(TRACK_IMPORT_QUEUE, {
  concurrency: parseInt(process.env.TRACK_IMPORT_CONCURRENCY ?? "1", 10),
})
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
      const gpxFile = await this.createGpx(job.data.filePath, job)
      gpxData = this.processGpxData(gpxFile)
      await this.writeGpx(job.data.filePath, gpxFile)
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
      geometry: gpxData.geometry as MultiLineString,
      processorVersion: PROCESSOR_VERSION,
    })

    this.eventEmitter.emit("track.imported", {
      id: track.id,
      name: track.name,
    })

    return {
      id: track.id,
    }
  }

  private async createGpx(filePath: string, job: Job): Promise<GPXFile> {
    const packets = await readGpmfPackets(filePath)
    const samples = extractGpsSamples(packets)
    await job.log(
      `Read ${samples.length} GPS samples from ${packets.length} GPMF packets`,
    )

    const gpxFile = new GPXFile({
      attributes: { creator: "StreetLens" },
      metadata: { name: path.basename(filePath) },
      wpt: [],
      rte: [],
      trk: [
        {
          trkseg: [
            {
              trkpt: samples.map((sample) => ({
                attributes: { lat: sample.latitude, lon: sample.longitude },
                ele: sample.altitude,
                time: sample.time,
              })),
            },
          ],
        },
      ],
    })

    return gpxFile
  }

  /** Only called once the track has usable data, so videos without a GPS fix don't get an empty GPX. */
  private async writeGpx(filePath: string, gpxFile: GPXFile) {
    await fs.writeFile(`${filePath}.gpx`, buildGPX(gpxFile, []))
    await removeLegacyTrackOutputs(filePath)
  }

  private processGpxData(gpxData: GPXFile): Feature {
    const segment = gpxData.getSegment(0, 0)
    const smoothedSegments = smoothTrackSegments(segment)

    const lines = smoothedSegments
      .map((seg) => {
        const simplified = ramerDouglasPeucker(seg.trkpt, 1)
        return simplified
          .filter(
            (point) => point.distance === undefined || point.distance >= 1,
          )
          .map((point) => [
            point.point.getLongitude(),
            point.point.getLatitude(),
          ])
      })
      .filter((coords) => coords.length >= 2)

    if (lines.length === 0 || lines.reduce((sum, l) => sum + l.length, 0) < 5) {
      throw new Error("Cleaned GPX yielded insignificant data")
    }

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: lines,
      },
    }
  }

  private async getCaptureDate(filePath: string): Promise<Date> {
    const { stdout } = await runCmd("ffprobe", [
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
