import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Track } from "./track.entity"
import { TracksService } from "./tracks.service"
import { BullModule } from "@nestjs/bullmq"
import {
  TRACK_IMPORT_QUEUE,
  TrackImportProcessor,
} from "./import/track-import.processor"
import { TracksController } from "./tracks.controller"
import { BullBoardModule } from "@bull-board/nestjs"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { TrackImage } from "./track-image.entity"
import {
  IMAGE_IMPORT_QUEUE,
  ImageImportProcessor,
} from "./import/image-import.processor"
import { ImagesController } from "./images.controller"

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
