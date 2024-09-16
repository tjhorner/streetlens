import { Module } from "@nestjs/common"
import { NotificationsService } from "./notifications.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { NotificationTarget } from "./notification-target.entity"
import { NotificationsController } from "./notifications.controller"

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTarget])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
