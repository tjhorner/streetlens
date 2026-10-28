import * as fs from "fs/promises"
import * as path from "path"

export async function removeLegacyTrackOutputs(videoPath: string) {
  await Promise.all(
    [`${videoPath}.kml`, `${videoPath}.csv`].map((file) =>
      fs.rm(file, { force: true }),
    ),
  )
}

export async function removeLegacyImageOutputs(videoPath: string) {
  const outputDir = path.join(
    path.dirname(videoPath),
    path.basename(videoPath, path.extname(videoPath)),
  )

  await fs.rm(path.join(outputDir, "mapillary_image_description.json"), {
    force: true,
  })

  try {
    await fs.rmdir(path.join(outputDir, path.basename(videoPath)))
  } catch (error) {
    if (!["ENOENT", "ENOTEMPTY"].includes(error.code)) throw error
  }
}
