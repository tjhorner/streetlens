import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq"
import { TracksService } from "../../tracks.service"
import { Job, UnrecoverableError } from "bullmq"
import { Feature, LineString } from "typeorm"
import { createReadStream } from "fs"
import * as crypto from "crypto"
import * as fs from "fs/promises"
import * as path from "path"
import { forwardRef, Inject } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { runCmd } from "src/util/run-command"
import { IMAGE_IMPORT_QUEUE } from "src/tracks/queues.constants"
import { Track } from "src/tracks/track.entity"

export interface ImageImportPayload {
  filePath: string
  force?: boolean
}

export interface GpxPoint {
  lat: number
  lon: number
  time: string
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

  @OnWorkerEvent("failed")
  onFailure(job: Job<ImageImportPayload>, error: Error) {
    this.eventEmitter.emit("image.importFailure", {
      filePath: job.data.filePath,
      error: error.message,
    })
  }

  async process(job: Job<ImageImportPayload>): Promise<any> {
    console.log(`Processing for ${job.data.filePath}`)
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

    const parts = path.basename(job.data.filePath).split('.')
    const date = parts[1]
    const hash_path = parts[1] + '_' + parts[3].substring(0, 4)
    const index = parseInt(parts[3].substring(4))

    var track = await this.tracksService.getByPath(hash_path)
    if (!track) {
      const empty_array: LineString = {
        type: "LineString",
        coordinates: [],
      }
      track = await this.tracksService.create({
        name: hash_path,
        captureDate: date,
        filePath: hash_path,
        fileHash: hash,
        geometry: empty_array,
      })
    }

    await job.updateProgress({
      status: "Extracting GPX data",
    })

    const gpxPoint: GpxPoint = await this.convertToGpx(job.data.filePath, job)

    this.tracksService.createImages([{
      sequenceNumber: index,
      captureDate: this.parseGPXDate(gpxPoint.time),
      filePath: job.data.filePath,
      location: {
        type: "Point",
        coordinates: [
          gpxPoint.lon,
          gpxPoint.lat,
        ],
      },
      heading: 0,
      track,
    }])

    await job.updateProgress({
      status: "Finalizing import",
    })

    const gpxFeature: Feature = await this.processGpxData(track)

    await this.tracksService.upsert({
      id: track.id,
      name: track.name,
      captureDate: this.parseGPXDate(gpxPoint.time),
      filePath: track.filePath,
      fileHash: hash,
      geometry: gpxFeature.geometry as LineString,
    })

    // this.eventEmitter.emit("image.imported", {
    //   id: track.id,
    //   name: track.name,
    // })

    return {
      id: job.data.filePath,
    }
  }

  private parseGPXDate(date: string): Date {
    return new Date(date)
  }

  private async convertToGpx(filePath: string, job: Job): Promise<GpxPoint> {
    const { stdout, stderr } = await runCmd("exiftool", [
      "-location:all",
      "-time:all",
      "-n",
      filePath,
    ])

    await job.log(
      `exiftool stdout:\n${stdout}\n\nexiftool stderr:\n${stderr}`,
    )

    const lines = stdout.trim().split("\n")
    let d: GpxPoint = { 'lat': null, 'lon': null, 'time': null }
    for (var row of lines.entries()) {
      if (row[1].indexOf('GPS Latitude  ') >= 0) {
        d['lat'] = parseFloat(row[1].split(":", 2)[1].trim())
      }
      if (row[1].indexOf('GPS Longitude  ') >= 0) {
        d['lon'] = parseFloat(row[1].split(":", 2)[1].trim())
      }
      if (row[1].indexOf('Date/Time Original') >= 0) {
        const parts = row[1].split(":")
        const date = parts[1].trim() + "-" + parts[2].trim() + "-" + parts[3].trim() + ":" + parts[4].trim() + ":" + parts[5].trim()
        d['time'] = date
      }
    }

    await job.log(
      `Parsed data:\n${JSON.stringify(d)}\n`,
    )
    if (d['lat'] === null || d['lon'] === null || d['time'] === null) {
      throw new Error(`Could not convert to GPX`)
    }

    return d
  }

  private async processGpxData(track: Track): Promise<Feature> {

    const track_images = await this.tracksService.getImages(track.id)
    const allPoints: number[][] = track_images.map((image) => (
      image.location.coordinates
    ))

    const headings: number[] = await this.computeHeadings(allPoints)
    const track_images_to_update = []
    for (let i = 0; i < headings.length; i++) {
      // Decimals get returned from DB as strings, so cast to Number
      const heading = Number(track_images[i].heading)
      if (heading !== headings[i]) {
        console.log(`Updating heading for image ${track_images[i].sequenceNumber} from ${heading} to ${headings[i]}`)
        track_images[i].heading = headings[i]
        track_images_to_update.push(track_images[i])
      }
    }
    if (track_images_to_update.length > 0) {
      await Promise.all(track_images_to_update.map(async (image) => {
        await this.tracksService.upsertImage(image)
      }))
    }
    //    const smoothedSegment = smoothTrackSegment(segment)

    //  const simplifiedPoints = ramerDouglasPeucker(smoothedSegment.trkpt, 1)
    //  const points = simplifiedPoints.filter(
    //   (point) => point.distance === undefined || point.distance >= 1,
    // )

    //if (points.length < 5) {
    //throw new Error("Cleaned GPX yielded insignificant data")
    //}

    console.log(`Processed ${allPoints.length} points for track ${track.id}`)

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: allPoints,
      },
    }
  }

  private async computeHeadings(points: number[][]): Promise<number[]> {
    const headings: number[] = []
    for (let i = 0; i < points.length - 1; i++) {
      const [lon1, lat1] = points[i]
      const [lon2, lat2] = points[i + 1]

      const heading = this.calculateBearing(lat1, lon1, lat2, lon2)
      headings.push(heading)
    }
    headings.push(headings[headings.length - 1]) // Repeat last heading
    return headings
  }

  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRadians = (deg: number) => (deg * Math.PI) / 180
    const toDegrees = (rad: number) => (rad * 180) / Math.PI

    const dLon = toRadians(lon2 - lon1)
    const y = Math.sin(dLon) * Math.cos(toRadians(lat2))
    const x =
      Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
      Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon)
    let bearing = toDegrees(Math.atan2(y, x))
    bearing = (bearing + 360) % 360 // Normalize to 0-360
    return bearing
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
