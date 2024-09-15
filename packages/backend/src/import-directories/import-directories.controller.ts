import { Body, Controller, Inject, Post } from "@nestjs/common"
import { ImportDirectoriesService } from "./import-directories.service"

@Controller("directories")
export class ImportDirectoriesController {
  constructor(
    @Inject(ImportDirectoriesService)
    private readonly importDirectoryService: ImportDirectoriesService,
  ) {}

  @Post()
  create(@Body("path") path: string) {
    return this.importDirectoryService.create(path)
  }
}
