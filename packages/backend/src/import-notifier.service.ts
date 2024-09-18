import { Injectable } from "@nestjs/common"
import { NotificationsService } from "./notifications/notifications.service"
import { OnEvent } from "@nestjs/event-emitter"
import path from "path"

@Injectable()
export class ImportNotifierService {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("track.imported")
  async onTrackImported({ name }: { name: string }) {
    await this.notificationsService.sendNotification(
      `Track Imported`,
      `${name} has successfully been imported`,
      "success",
    )
  }

  @OnEvent("track.imagesImported")
  async onTrackImagesImported({
    name,
    imageCount,
  }: {
    name: string
    imageCount: number
  }) {
    await this.notificationsService.sendNotification(
      `Images Imported`,
      `Successfully imported ${imageCount} images from ${name}`,
      "success",
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
    const fileName = path.basename(filePath)
    await this.notificationsService.sendNotification(
      `Track Import Failed`,
      `${fileName} failed to import: ${error}`,
      "error",
    )
  }
}
