import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { BullBoardModule } from "@bull-board/nestjs"
import { BullModule } from "@nestjs/bullmq"
import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TrackImportProcessor } from "./import/track-import.processor"
import { ImagesController } from "./track-images/images.controller"
import { ImageImportProcessor } from "./track-images/import/image-import.processor"
import { TrackImage } from "./track-images/track-image.entity"
import { Track } from "./track.entity"
import { TracksController } from "./tracks.controller"
import { TracksService } from "./tracks.service"
import { IMAGE_IMPORT_QUEUE, TRACK_IMPORT_QUEUE } from "./queues.constants"

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, TrackImage]),
    BullModule.registerQueue(
      {
        name: TRACK_IMPORT_QUEUE,
      },
      {
        name: IMAGE_IMPORT_QUEUE,
      },
    ),
    BullBoardModule.forFeature(
      {
        name: TRACK_IMPORT_QUEUE,
        adapter: BullMQAdapter,
      },
      {
        name: IMAGE_IMPORT_QUEUE,
        adapter: BullMQAdapter,
      },
    ),
  ],
  providers: [TracksService, TrackImportProcessor, ImageImportProcessor],
  controllers: [TracksController, ImagesController],
  exports: [TracksService],
})
export class TracksModule {}
