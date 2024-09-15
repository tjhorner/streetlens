import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ImportDirectory } from "./import-directory.entity"
import { FileWatcherService } from "./file-watcher.service"
import { ImportDirectoriesController } from "./import-directories.controller"
import { ImportDirectoriesService } from "./import-directories.service"

@Module({
  imports: [TypeOrmModule.forFeature([ImportDirectory])],
  providers: [FileWatcherService, ImportDirectoriesService],
  controllers: [ImportDirectoriesController],
})
export class ImportDirectoriesModule {}
