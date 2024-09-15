import { Body, Controller, Inject, Post } from "@nestjs/common"
import { ImportDirectoryService } from "./import-directory.service"

@Controller("directories")
export class ImportDirectoriesController {
  constructor(
    @Inject(ImportDirectoryService)
    private readonly importDirectoryService: ImportDirectoryService,
  ) {}

  @Post()
  create(@Body("path") path: string) {
    return this.importDirectoryService.create(path)
  }
}
