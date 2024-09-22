import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
} from "@nestjs/common"
import { ImportDirectoriesService } from "./import-directories.service"

@Controller("directories")
export class ImportDirectoriesController {
  constructor(
    @Inject(ImportDirectoriesService)
    private readonly importDirectoryService: ImportDirectoriesService,
  ) {}

  @Get()
  list() {
    return this.importDirectoryService.list()
  }

  @Post()
  create(@Body("path") path: string) {
    return this.importDirectoryService.create(path)
  }

  @Delete(":id")
  delete(@Param("id") id: number) {
    return this.importDirectoryService.delete(id)
  }
}
