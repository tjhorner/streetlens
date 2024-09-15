import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { ImportDirectory } from "./import-directory.entity"
import { Repository } from "typeorm"
import { EventEmitter2 } from "@nestjs/event-emitter"

@Injectable()
export class ImportDirectoryService {
  constructor(
    @InjectRepository(ImportDirectory)
    private importDirectoryRepository: Repository<ImportDirectory>,

    private eventEmitter: EventEmitter2,
  ) {}

  async list() {
    return this.importDirectoryRepository.find()
  }

  async create(directoryPath: string) {
    const importDirectory = await this.importDirectoryRepository.save({
      directoryPath,
    })

    this.eventEmitter.emit("importDirectory.created", importDirectory)
    return importDirectory
  }
}
