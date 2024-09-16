import { Injectable } from "@nestjs/common"
import { NotificationsService } from "./notifications/notifications.service"
import { OnEvent } from "@nestjs/event-emitter"

@Injectable()
export class ImportNotifierService {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("track.imported")
  async onTrackImported({ name }: { name: string }) {
    await this.notificationsService.sendNotification(
      `Track Imported`,
      `${name} has successfully been imported`,
    )
  }

  @OnEvent("track.importFailure")
  async onTrackImportFailure({
    filePath,
    error,
  }: {
    filePath: string
    error: string
  }) {
    await this.notificationsService.sendNotification(
      `Track Import Failed`,
      `${filePath} failed to import: ${error}`,
    )
  }
}
