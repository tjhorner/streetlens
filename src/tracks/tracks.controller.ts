import { Body, Controller, Get, Post, Query } from "@nestjs/common"
import { TracksService } from "./tracks.service"

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

  @Post("import")
  async import(
    @Body("filePath") filePath: string,
    @Body("force") force?: boolean,
  ) {
    const job = await this.tracksService.startImport(filePath, force)
    return job.id
  }
}
