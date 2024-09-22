import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
} from "@nestjs/common"
import { NotificationsService } from "./notifications.service"

@Controller("notification-targets")
export class NotificationTargetsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  list() {
    return this.notificationsService.listTargets()
  }

  @Post()
  create(@Body("appriseUrl") appriseUrl: string) {
    return this.notificationsService.createTarget(appriseUrl)
  }

  @Delete(":id")
  delete(@Param("id") id: number) {
    return this.notificationsService.deleteTarget(id)
  }
}
