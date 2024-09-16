import { NotificationsService } from "./notifications/notifications.service"
import { OnEvent } from "@nestjs/event-emitter"

export class ImportNotifierService {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("track.imported")
  async onTrackImported({ name }: { name: string }) {
    await this.notificationsService.sendNotification(
      `Track Imported`,
      `${name} has successfully been imported`,
    )
  }
}
