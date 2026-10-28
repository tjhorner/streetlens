import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import {
  removeLegacyImageOutputs,
  removeLegacyTrackOutputs,
} from "./legacy-outputs"

describe("legacy output cleanup", () => {
  let dir: string
  let video: string

  async function touch(...parts: string[]) {
    const file = path.join(dir, ...parts)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, "")
  }

  async function listFiles() {
    const entries = await fs.readdir(dir, { recursive: true })
    return entries.sort()
  }

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "streetlens-legacy-"))
    video = path.join(dir, "GS012000.360")
    await touch("GS012000.360")
    await touch("GS012000.360.gpx")
    await touch("GS012000.360.kml")
    await touch("GS012000.360.csv")
    await touch("GS012000", "mapillary_image_description.json")
    await touch("GS012000", "frames", "GS012000_000001.jpg")
    await fs.mkdir(path.join(dir, "GS012000", "GS012000.360"))
  })

  afterEach(() => fs.rm(dir, { recursive: true, force: true }))

  it("removes gopro2gpx's KML and CSV but keeps the GPX", async () => {
    await removeLegacyTrackOutputs(video)

    expect(await listFiles()).not.toContain("GS012000.360.kml")
    expect(await listFiles()).not.toContain("GS012000.360.csv")
    expect(await listFiles()).toContain("GS012000.360.gpx")
  })

  it("removes mapillary_tools' description file and empty image folder", async () => {
    await removeLegacyImageOutputs(video)

    expect(await listFiles()).toEqual([
      "GS012000",
      "GS012000.360",
      "GS012000.360.csv",
      "GS012000.360.gpx",
      "GS012000.360.kml",
      path.join("GS012000", "frames"),
      path.join("GS012000", "frames", "GS012000_000001.jpg"),
    ])
  })

  it("keeps the old image folder if anything is still in it", async () => {
    await touch("GS012000", "GS012000.360", "GS012000_0_000001.jpg")

    await removeLegacyImageOutputs(video)

    expect(await listFiles()).toContain(
      path.join("GS012000", "GS012000.360", "GS012000_0_000001.jpg"),
    )
  })

  it("does nothing when there are no leftovers", async () => {
    await removeLegacyImageOutputs(path.join(dir, "missing.360"))
    await removeLegacyTrackOutputs(path.join(dir, "missing.360"))
  })
})
