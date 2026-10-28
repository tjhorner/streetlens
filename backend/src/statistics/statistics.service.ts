import { Injectable } from "@nestjs/common"
import { DataSource } from "typeorm"
import * as fs from "node:fs/promises"

interface StorageStatistics {
  bytes: number
  files: number
  unavailableFiles: number
}

export interface Statistics {
  tracks: number
  images: number
  distanceMeters: number
  tracksWithImages: number
  firstCaptureDate: string | null
  lastCaptureDate: string | null
  lastImportDate: string | null
  storage: { images: StorageStatistics; videos: StorageStatistics }
  generatedAt: string
}

@Injectable()
export class StatisticsService {
  private cached?: Statistics
  private pending?: Promise<Statistics>

  constructor(private readonly dataSource: DataSource) {}

  get(): Promise<Statistics> {
    if (
      this.cached &&
      Date.now() - Date.parse(this.cached.generatedAt) < 60_000
    ) {
      return Promise.resolve(this.cached)
    }
    if (!this.pending) {
      this.pending = this.calculate()
        .then((statistics) => (this.cached = statistics))
        .finally(() => {
          this.pending = undefined
        })
    }
    return this.pending
  }

  private async calculate(): Promise<Statistics> {
    const [[tracks], [images], paths] = await Promise.all([
      this.dataSource.query(`
        SELECT COUNT(*) AS count,
          COALESCE(SUM(ST_Length(ST_SetSRID(geometry, 4326)::geography)), 0) AS distance,
          COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM track_image WHERE track_image."trackId" = track.id
          )) AS "withImages",
          MIN("captureDate") AS "firstCaptureDate",
          MAX("captureDate") AS "lastCaptureDate",
          MAX("importDate") AS "lastImportDate"
        FROM track
      `),
      this.dataSource.query(`
        SELECT COUNT(*) AS count, MAX("importDate") AS "lastImportDate"
        FROM track_image
      `),
      this.dataSource.query(`
        SELECT DISTINCT 'videos' AS kind, "filePath" FROM track
        UNION ALL
        SELECT DISTINCT 'images' AS kind, "filePath" FROM track_image
      `) as Promise<{ kind: "images" | "videos"; filePath: string }[]>,
    ])

    const storage = {
      images: { bytes: 0, files: 0, unavailableFiles: 0 },
      videos: { bytes: 0, files: 0, unavailableFiles: 0 },
    }
    let next = 0

    await Promise.all(
      Array.from({ length: Math.min(16, paths.length) }, async () => {
        while (next < paths.length) {
          const { kind, filePath } = paths[next++]
          const totals = storage[kind]
          try {
            const file = await fs.stat(filePath)
            if (!file.isFile()) {
              totals.unavailableFiles++
              continue
            }
            totals.bytes += file.size
            totals.files++
          } catch (error: any) {
            if (
              !["ENOENT", "ENOTDIR", "EACCES", "EPERM"].includes(error.code)
            ) {
              throw error
            }
            totals.unavailableFiles++
          }
        }
      }),
    )

    const importDates = [tracks.lastImportDate, images.lastImportDate]
      .filter(Boolean)
      .map((date) => new Date(date).getTime())
    return {
      tracks: Number(tracks.count),
      images: Number(images.count),
      distanceMeters: Number(tracks.distance),
      tracksWithImages: Number(tracks.withImages),
      firstCaptureDate: tracks.firstCaptureDate
        ? new Date(tracks.firstCaptureDate).toISOString()
        : null,
      lastCaptureDate: tracks.lastCaptureDate
        ? new Date(tracks.lastCaptureDate).toISOString()
        : null,
      lastImportDate: importDates.length
        ? new Date(Math.max(...importDates)).toISOString()
        : null,
      storage,
      generatedAt: new Date().toISOString(),
    }
  }
}
