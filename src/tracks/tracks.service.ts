import { HttpException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Track } from "./track.entity"
import { DeepPartial, Repository } from "typeorm"
import { InjectQueue } from "@nestjs/bullmq"
import {
  TRACK_IMPORT_QUEUE,
  TrackImportPayload,
} from "./track-import.processor"
import { Queue } from "bullmq"
import * as fs from "node:fs"
import * as path from "node:path"

export interface TrackFilters {
  start?: string
  end?: string
}

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private tracksRepository: Repository<Track>,

    @InjectQueue(TRACK_IMPORT_QUEUE)
    private trackImportQueue: Queue<TrackImportPayload>,
  ) {}

  list(filters: TrackFilters = {}): Promise<Track[]> {
    const query = this.tracksRepository.createQueryBuilder("track")

    if (filters.start > filters.end) {
      throw new HttpException("start must be less than or equal to end", 400)
    }

    if (filters.start) {
      query.andWhere("track.captureDate >= :start", {
        start: new Date(filters.start),
      })
    }

    if (filters.end) {
      query.andWhere("track.captureDate <= :end", {
        end: new Date(filters.end),
      })
    }

    return query.getMany()
  }

  async get(id: number): Promise<Track> {
    return this.tracksRepository.findOneBy({ id })
  }

  async create(track: DeepPartial<Track>): Promise<Track> {
    return this.tracksRepository.save(track)
  }

  async existsByFileHash(fileHash: string): Promise<boolean> {
    const count = await this.tracksRepository.count({ where: { fileHash } })
    return count > 0
  }

  async startImport(filePath: string) {
    const exists = fs.existsSync(filePath)
    if (!exists) {
      throw new Error(`File not found: ${filePath}`)
    }

    return this.trackImportQueue.add(path.basename(filePath), { filePath })
  }

  toGeoJSON(tracks: Track[]) {
    return {
      type: "FeatureCollection",
      features: tracks.map((track) => track.toGeoJSON()),
    }
  }
}
