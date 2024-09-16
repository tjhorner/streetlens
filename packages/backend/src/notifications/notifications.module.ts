import { Module } from "@nestjs/common"
import { NotificationsService } from "./notifications.service"
import { TypeOrmModule } from "@nestjs/typeorm"
import { NotificationTarget } from "./notification-target.entity"

@Module({
  imports: [TypeOrmModule.forFeature([NotificationTarget])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
