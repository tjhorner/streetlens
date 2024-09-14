import { Controller, Get, Post, Query } from "@nestjs/common"
import { TracksService } from "./tracks.service"

@Controller("tracks")
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get()
  async list(@Query("start") start?: string, @Query("end") end?: string) {
    const tracks = await this.tracksService.list({ start, end })
    return this.tracksService.toGeoJSON(tracks)
  }

  @Post("import")
  async import(@Query("filePath") filePath: string) {
    const job = await this.tracksService.startImport(filePath)
    return job.id
  }
}
