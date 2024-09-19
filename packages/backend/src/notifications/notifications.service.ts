import { Injectable } from "@nestjs/common"
import { NotificationTarget } from "./notification-target.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { runCmd } from "src/util/run-command"

export type NotificationType = "success" | "error" | "info"

export interface NotificationSendEvent {
  title: string
  message: string
  type?: NotificationType
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationTarget)
    private readonly notificationTargetRepository: Repository<NotificationTarget>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  createTarget(appriseUrl: string) {
    return this.notificationTargetRepository.save({ appriseUrl })
  }

  async sendNotification(
    title: string,
    message: string,
    type?: NotificationType,
  ) {
    const targets = await this.notificationTargetRepository.find({
      select: { appriseUrl: true },
    })

    this.eventEmitter.emit("notification.send", { title, message, type })

    if (targets.length === 0) return
    const urls = targets.map((target) => target.appriseUrl)
    return this.sendToUrls(urls, title, message)
  }

  private async sendToUrls(urls: string[], title: string, message: string) {
    return runCmd("apprise", ["-t", title, "-b", message, ...urls])
  }
}
