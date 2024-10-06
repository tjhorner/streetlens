import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  StreamableFile,
  Header,
} from "@nestjs/common"
import { TracksService } from "../tracks.service"
import * as fs from "fs"

@Controller("images")
export class ImagesController {
  constructor(private readonly tracksService: TracksService) {}

  @Get(":id.jpg")
  @Header("Cache-Control", "public, max-age=3600")
  async getImageFile(@Param("id", ParseIntPipe) id: number) {
    const image = await this.tracksService.getImagePath(id)
    return new StreamableFile(fs.createReadStream(image), {
      type: "image/jpeg",
      disposition: "inline",
    })
  }
}
