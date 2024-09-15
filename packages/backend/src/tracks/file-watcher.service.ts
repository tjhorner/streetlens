import { forwardRef, Inject, Injectable } from "@nestjs/common"
import { TracksService } from "./tracks.service"
import * as chokidar from "chokidar"
import { ImportDirectoryService } from "./import-directory.service"
import { OnEvent } from "@nestjs/event-emitter"
import { ImportDirectory } from "./import-directory.entity"

@Injectable()
export class FileWatcherService {
  private readonly watchers: Record<string, chokidar.FSWatcher> = {}

  constructor(
    @Inject(forwardRef(() => TracksService))
    private readonly tracksService: TracksService,

    @Inject(forwardRef(() => ImportDirectoryService))
    private readonly importDirectoryService: ImportDirectoryService,
  ) {}

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
      if (!filePath.endsWith(".360")) {
        return
      }

      await this.tracksService.startImport(filePath)
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
