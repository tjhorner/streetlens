import {
  forwardRef,
  Inject,
  Injectable,
  OnApplicationBootstrap,
} from "@nestjs/common"
import * as chokidar from "chokidar"
import { ImportDirectoriesService } from "./import-directories.service"
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter"
import { ImportDirectory } from "./import-directory.entity"

@Injectable()
export class FileWatcherService implements OnApplicationBootstrap {
  private readonly watchers: Record<string, chokidar.FSWatcher> = {}

  constructor(
    @Inject(forwardRef(() => ImportDirectoriesService))
    private readonly importDirectoryService: ImportDirectoriesService,

    private eventEmitter: EventEmitter2,
  ) {}

  onApplicationBootstrap() {
    this.watchAll()
  }

  @OnEvent("importDirectory.created")
  async onImportDirectoryCreated(importDirectory: ImportDirectory) {
    console.log(
      "Watching new directory, running initial import",
      importDirectory.directoryPath,
    )

    this.watch(importDirectory.directoryPath, false)
  }

  async watchAll() {
    const importDirectories = await this.importDirectoryService.list()

    for (const importDirectory of importDirectories) {
      console.log("Watching", importDirectory.directoryPath)
      this.watch(importDirectory.directoryPath)
    }
  }

  watch(directoryPath: string, ignoreInitial = true) {
    const watcher = chokidar.watch(directoryPath, {
      awaitWriteFinish: true,
      ignoreInitial,
    })

    watcher.on("add", async (filePath) => {
      this.eventEmitter.emit("file.added", filePath)
    })

    this.watchers[directoryPath] = watcher
  }

  unwatch(directoryPath: string) {
    const watcher = this.watchers[directoryPath]

    if (watcher) {
      watcher.close()
      delete this.watchers[directoryPath]
    }
  }
}