import { Injectable } from "@nestjs/common"
import { TracksService } from "./tracks/tracks.service"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class TrackWatcherService {
  constructor(private readonly tracksService: TracksService) {}

  @OnEvent("file.added")
  async onFileAdded(filePath: string) {
    if (!filePath.endsWith(".360")) {
      return
    }

    console.log("Importing new track", filePath)
    await this.tracksService.startImport(filePath)
  }
}
