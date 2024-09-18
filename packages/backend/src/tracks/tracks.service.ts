import { HttpException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Track } from "./track.entity"
import { DeepPartial, Feature, Repository } from "typeorm"
import { InjectQueue } from "@nestjs/bullmq"
import {
  TRACK_IMPORT_QUEUE,
  TrackImportPayload,
} from "./import/track-import.processor"
import { JobType, Queue } from "bullmq"
import * as fs from "node:fs"
import * as path from "node:path"
import { TrackImage } from "./track-image.entity"
import {
  IMAGE_IMPORT_QUEUE,
  ImageImportPayload,
} from "./import/image-import.processor"
import { OnEvent } from "@nestjs/event-emitter"

export interface TrackFilters {
  start?: string
  end?: string
  bbox?: string
}

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track)
    private tracksRepository: Repository<Track>,

    @InjectRepository(TrackImage)
    private trackImagesRepository: Repository<TrackImage>,

    @InjectQueue(TRACK_IMPORT_QUEUE)
    private trackImportQueue: Queue<TrackImportPayload>,

    @InjectQueue(IMAGE_IMPORT_QUEUE)
    private imageImportQueue: Queue<ImageImportPayload>,
  ) {}

  list(filters: TrackFilters = {}): Promise<Track[]> {
    const query = this.tracksRepository
      .createQueryBuilder("track")
      .leftJoin("track.images", "track_image")
      .addSelect("COUNT(track_image.id) > 0", "track_hasImages")
      .groupBy("track.id")
      .orderBy("track.captureDate", "DESC")

    if (
      filters.start &&
      filters.end &&
      new Date(filters.start) > new Date(filters.end)
    ) {
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

    if (filters.bbox) {
      const [minLon, minLat, maxLon, maxLat] = filters.bbox
        .split(",")
        .map(Number)

      query.andWhere(
        "ST_Intersects(track.geometry, ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326))",
        { minLon, minLat, maxLon, maxLat },
      )
    }

    return query.getMany()
  }

  async listImports(limit: number = 10, state?: JobType) {
    return this.trackImportQueue.getJobs(
      state ?? ["wait", "waiting", "active", "completed", "failed", "paused"],
      0,
      limit - 1,
    )
  }

  async get(id: number): Promise<Track> {
    return this.tracksRepository.findOneBy({ id })
  }

  async create(track: DeepPartial<Track>): Promise<Track> {
    return this.tracksRepository.save(track)
  }

  async getImages(trackId: number): Promise<TrackImage[]> {
    return this.trackImagesRepository.find({
      where: { track: { id: trackId } },
      order: { sequenceNumber: "ASC" },
    })
  }

  async getImagePath(imageId: number): Promise<string> {
    const image = await this.trackImagesRepository.findOneBy({ id: imageId })

    if (!image) {
      throw new HttpException("Image not found", 404)
    }

    return image.filePath
  }

  async createImages(images: DeepPartial<TrackImage>[]): Promise<TrackImage[]> {
    return this.trackImagesRepository.save(images)
  }

  async upsert(track: DeepPartial<Track>) {
    const existing = await this.tracksRepository.findOne({
      where: { filePath: track.filePath },
    })

    if (existing) {
      return this.tracksRepository.save({
        ...existing,
        ...track,
      })
    }

    return this.tracksRepository.save(track)
  }

  async existsByFileHash(fileHash: string): Promise<boolean> {
    const count = await this.tracksRepository.count({ where: { fileHash } })
    return count > 0
  }

  async startImport(filePath: string, force: boolean = false) {
    const exists = fs.existsSync(filePath)
    if (!exists) {
      throw new Error(`File not found: ${filePath}`)
    }

    return this.trackImportQueue.add(path.basename(filePath), {
      filePath,
      force,
    })
  }

  @OnEvent("track.imported")
  handleTrackImported({ id }: { id: number; name: string }) {
    this.imageImportQueue.add(id.toString(), { trackId: id })
  }

  async startImageImport(trackId: number) {
    return this.imageImportQueue.add(trackId.toString(), { trackId })
  }

  async processMissingImages() {
    const tracksWithoutImages = await this.tracksRepository
      .createQueryBuilder("track")
      .where(
        `NOT EXISTS (SELECT 1 FROM track_image WHERE track_image."trackId" = track.id)`,
      )
      .getMany()

    const jobs = tracksWithoutImages.map((track) => ({
      name: track.id.toString(),
      data: { trackId: track.id },
    }))

    return this.imageImportQueue.addBulk(jobs)
  }

  toGeoJSON(tracks: { toGeoJSON(): Feature }[]) {
    return {
      type: "FeatureCollection",
      features: tracks.map((track) => track.toGeoJSON()),
    }
  }
}
