import { Body, Controller, Get, Post, Query } from "@nestjs/common"
import { TracksService } from "./tracks.service"
import { JobType } from "bullmq"

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

  @Get("imports")
  async listImports(
    @Query("limit") limit: number = 10,
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
