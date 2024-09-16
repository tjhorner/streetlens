import { Injectable } from "@nestjs/common"
import { NotificationTarget } from "./notification-target.entity"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { execFile } from "child_process"

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationTarget)
    private notificationTargetRepository: Repository<NotificationTarget>,
  ) {}

  createTarget(appriseUrl: string) {
    return this.notificationTargetRepository.save({ appriseUrl })
  }

  async sendNotification(title: string, message: string) {
    const targets = await this.notificationTargetRepository.find({
      select: { appriseUrl: true },
    })

    const urls = targets.map((target) => target.appriseUrl)
    return this.sendToUrls(urls, title, message)
  }

  private async sendToUrls(urls: string[], title: string, message: string) {
    return this.runCmd("apprise", ["-t", title, "-b", message, ...urls])
  }

  private runCmd(command: string, args: string[] = []) {
    return new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        execFile(command, args, (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      },
    )
  }
}
