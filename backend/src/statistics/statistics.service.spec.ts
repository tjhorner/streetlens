import { DataSource } from "typeorm"
import * as fs from "node:fs/promises"
import { StatisticsService } from "./statistics.service"

jest.mock("node:fs/promises", () => ({ stat: jest.fn() }))

describe("StatisticsService", () => {
  const query = jest.fn()
  const stat = fs.stat as jest.Mock
  let service: StatisticsService

  function results(paths = []) {
    query
      .mockResolvedValueOnce([
        {
          count: "2",
          distance: "3218.688",
          withImages: "1",
          firstCaptureDate: "2026-01-01T00:00:00Z",
          lastCaptureDate: "2026-02-01T00:00:00Z",
          lastImportDate: "2026-02-02T00:00:00Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          count: "3",
          lastImportDate: "2026-02-03T00:00:00Z",
        },
      ])
      .mockResolvedValueOnce(paths)
      .mockResolvedValueOnce([{ date: "2026-01-01", distance: "3218.688" }])
  }

  beforeEach(() => {
    jest.resetAllMocks()
    service = new StatisticsService({ query } as unknown as DataSource)
  })

  afterEach(() => jest.restoreAllMocks())

  it("returns numeric aggregates and sums available media by kind", async () => {
    results([
      { kind: "videos", filePath: "/video.360" },
      { kind: "images", filePath: "/image.jpg" },
      { kind: "images", filePath: "/missing.jpg" },
      { kind: "images", filePath: "/unreadable.jpg" },
      { kind: "images", filePath: "/directory" },
    ])
    stat.mockImplementation(async (path) => {
      if (path === "/missing.jpg")
        throw Object.assign(new Error(), { code: "ENOENT" })
      if (path === "/unreadable.jpg")
        throw Object.assign(new Error(), { code: "EACCES" })
      return {
        size: path === "/video.360" ? 4096 : 1024,
        isFile: () => path !== "/directory",
      }
    })

    expect(await service.get()).toMatchObject({
      tracks: 2,
      images: 3,
      distanceMeters: 3218.688,
      tracksWithImages: 1,
      dailyActivity: [{ date: "2026-01-01", distanceMeters: 3218.688 }],
      firstCaptureDate: "2026-01-01T00:00:00.000Z",
      lastCaptureDate: "2026-02-01T00:00:00.000Z",
      lastImportDate: "2026-02-03T00:00:00.000Z",
      storage: {
        videos: { bytes: 4096, files: 1, unavailableFiles: 0 },
        images: { bytes: 1024, files: 1, unavailableFiles: 3 },
      },
    })
    expect(query.mock.calls[0][0]).toContain("::geography")
    expect(query.mock.calls[2][0]).toContain("SELECT DISTINCT")
  })

  it("handles an empty library", async () => {
    query
      .mockResolvedValueOnce([
        {
          count: "0",
          distance: "0",
          withImages: "0",
          firstCaptureDate: null,
          lastCaptureDate: null,
          lastImportDate: null,
        },
      ])
      .mockResolvedValueOnce([{ count: "0", lastImportDate: null }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    expect(await service.get()).toMatchObject({
      tracks: 0,
      images: 0,
      distanceMeters: 0,
      tracksWithImages: 0,
      firstCaptureDate: null,
      lastCaptureDate: null,
      lastImportDate: null,
      storage: {
        images: { bytes: 0, files: 0, unavailableFiles: 0 },
        videos: { bytes: 0, files: 0, unavailableFiles: 0 },
      },
    })
    expect(stat).not.toHaveBeenCalled()
  })

  it("shares concurrent work, caches results, and recalculates after a minute", async () => {
    const now = jest.spyOn(Date, "now")
    results()
    const first = service.get()
    expect(service.get()).toBe(first)
    const result = await first
    expect(await service.get()).toBe(result)
    expect(query).toHaveBeenCalledTimes(4)

    now.mockReturnValue(Date.parse(result.generatedAt) + 60_001)
    results()
    await service.get()
    expect(query).toHaveBeenCalledTimes(8)
  })

  it("allows retrying after a failed calculation", async () => {
    query.mockRejectedValueOnce(new Error("Database unavailable"))
    await expect(service.get()).rejects.toThrow("Database unavailable")
    results()
    expect((await service.get()).tracks).toBe(2)
  })

  it("does not silently hide unexpected filesystem errors", async () => {
    results([{ kind: "videos", filePath: "/video.360" }])
    stat.mockRejectedValue(
      Object.assign(new Error("I/O error"), { code: "EIO" }),
    )
    await expect(service.get()).rejects.toThrow("I/O error")
  })
})
