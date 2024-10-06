import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common"
import { TracksService } from "./tracks.service"
import { JobType } from "bullmq"
import * as fs from "fs"
import path from "path"
import { ListTracksDto } from "./dto/list-tracks.input"

@Controller("tracks")
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  async list(@Query() dto: ListTracksDto) {
    if (dto.order && !["ASC", "DESC"].includes(dto.order)) {
      throw new Error("Invalid order")
    }

    const tracks = await this.tracksService.list(dto)

    if (dto.format === "geojson") {
      return this.tracksService.toGeoJSON(tracks)
    }

    return tracks.map((track) => ({
      id: track.id,
      captureDate: track.captureDate,
      filePath: track.filePath,
      fileHash: track.fileHash,
      hasImages: track.hasImages,
    }))
  }

  @Get("imports")
  async listImports(
    @Query("limit", ParseIntPipe) limit: number = 10,
    @Query("state") state?: JobType,
  ) {
    const jobs = await this.tracksService.listImports(limit, state)
    return Promise.all(
      jobs.map(async (job) => {
        return {
          id: job.id,
          name: job.name,
          status: await job.getState(),
          createdAt: job.timestamp,
          finishedAt: job.finishedOn ?? null,
        }
      }),
    )
  }

  @Post("imports")
  async import(@Body("path") filePath: string, @Body("force") force?: boolean) {
    const job = await this.tracksService.startImport(filePath, force)
    return job.id
  }

  @Post("process-missing-images")
  async processMissingImages() {
    const jobs = await this.tracksService.processMissingImages()
    return jobs.map((job) => job.id)
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const track = await this.tracksService.get(id)
    return {
      id: track.id,
      captureDate: track.captureDate,
      filePath: track.filePath,
      fileHash: track.fileHash,
      hasImages: track.hasImages,
    }
  }

  @Get(":id/images")
  async getImages(
    @Param("id", ParseIntPipe) id: number,
    @Query("format") format?: string,
  ) {
    const images = await this.tracksService.getImages(id)

    if (format === "geojson") {
      return this.tracksService.toGeoJSON(images)
    }

    return images.map((image) => ({
      id: image.id,
      sequenceNumber: image.sequenceNumber,
      captureDate: image.captureDate,
      location: image.location,
      heading: image.heading,
    }))
  }

  @Get(":id/geojson")
  async getGeoJSON(@Param("id", ParseIntPipe) id: number) {
    const track = await this.tracksService.get(id)
    return track.toGeoJSON()
  }

  @Get(":id/gpx")
  async getGpx(@Param("id", ParseIntPipe) id: number) {
    const track = await this.tracksService.get(id)
    return new StreamableFile(fs.createReadStream(`${track.filePath}.gpx`), {
      disposition: `attachment; filename="${track.name}.gpx"`,
    })
  }

  @Get(":id/download")
  async download(@Param("id", ParseIntPipe) id: number) {
    const track = await this.tracksService.get(id)

    const name = path.basename(track.filePath)
    const size = fs.statSync(track.filePath).size

    return new StreamableFile(fs.createReadStream(track.filePath), {
      disposition: `attachment; filename="${name}"`,
      length: size,
    })
  }
}
