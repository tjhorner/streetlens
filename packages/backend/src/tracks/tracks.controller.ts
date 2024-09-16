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

@Controller("tracks")
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  async list(
    @Query("start") start?: string,
    @Query("end") end?: string,
    @Query("bbox") bbox?: string,
    @Query("format") format?: string,
  ) {
    const tracks = await this.tracksService.list({ start, end, bbox })

    if (format === "geojson") {
      return this.tracksService.toGeoJSON(tracks)
    }

    return tracks.map((track) => ({
      id: track.id,
      captureDate: track.captureDate,
      filePath: track.filePath,
      fileHash: track.fileHash,
    }))
  }

  @Get(":id/gpx")
  async getGpx(@Param("id", ParseIntPipe) id: number) {
    const track = await this.tracksService.get(id)
    return new StreamableFile(fs.createReadStream(`${track.filePath}.gpx`), {
      disposition: `attachment; filename="${track.name}.gpx"`,
    })
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
}
