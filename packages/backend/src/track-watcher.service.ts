import { Injectable, Logger } from "@nestjs/common"
import { TracksService } from "./tracks/tracks.service"
import { OnEvent } from "@nestjs/event-emitter"
import { NotificationsService } from "./notifications/notifications.service"

@Injectable()
export class TrackWatcherService {
  private readonly logger = new Logger(TrackWatcherService.name)

  constructor(
    private readonly tracksService: TracksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent("file.added")
  async onFileAdded(filePath: string) {
    if (!filePath.endsWith(".360")) {
      return
    }

    this.logger.log(`New file detected; import queued for ${filePath}`)
    this.notificationsService.sendNotification(
      "Import Queued",
      `New file detected; import queued for ${filePath}`,
    )

    await this.tracksService.startImport(filePath)
  }
}
