import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Track } from "./track.entity"
import { TracksService } from "./tracks.service"
import { BullModule } from "@nestjs/bullmq"
import {
  TRACK_IMPORT_QUEUE,
  TrackImportProcessor,
} from "./track-import.processor"
import { TracksController } from "./tracks.controller"
import { BullBoardModule } from "@bull-board/nestjs"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ImportDirectory } from "./import-directory.entity"
import { FileWatcherService } from "./file-watcher.service"
import { ImportDirectoryService } from "./import-directory.service"
import { ImportDirectoriesController } from "./import-directories.controller"

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, ImportDirectory]),
    BullModule.registerQueue({
      name: TRACK_IMPORT_QUEUE,
    }),
    BullBoardModule.forFeature({
      name: TRACK_IMPORT_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    TracksService,
    ImportDirectoryService,
    TrackImportProcessor,
    FileWatcherService,
  ],
  controllers: [TracksController, ImportDirectoriesController],
})
export class TracksModule {}
