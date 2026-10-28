import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"
import { runCmd, runCmdForBuffer } from "../util/run-command"

const MAX_LENS_STREAMS = [0, 4]

/** Presentation timestamps (seconds) of every frame in the video stream, in display order. */
export async function readFrameTimes(
  videoPath: string,
  streamIndex = MAX_LENS_STREAMS[0],
): Promise<number[]> {
  const output = await runCmdForBuffer("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    String(streamIndex),
    "-show_entries",
    "packet=pts_time",
    "-of",
    "csv=p=0",
    videoPath,
  ])

  return output
    .toString()
    .trim()
    .split("\n")
    .map(Number)
    .sort((a, b) => a - b)
}

export interface FrameToExtract {
  /** Index of the frame in presentation order */
  frameIndex: number
  /** Presentation timestamp in seconds */
  videoTime: number
}

const MAX_DECODE_GAP_SECONDS = 10
const SEEK_LEAD_SECONDS = 0.01

/**
 * Stitches the given frames of a GoPro MAX .360 video into equirectangular JPEGs.
 * Returns the image paths sorted by frame index.
 */
export async function extractEquirectangularFrames(
  videoPath: string,
  outDir: string,
  frames: FrameToExtract[],
  vaapiDevice = process.env.VAAPI_DEVICE ??
    process.env.MAPILLARY_TOOLS_VAAPI_DEVICE,
): Promise<string[]> {
  const sortedFrames = [...frames].sort((a, b) => a.frameIndex - b.frameIndex)
  const prefix = path.basename(videoPath, path.extname(videoPath))
  await fs.mkdir(outDir, { recursive: true })

  const filterDir = await fs.mkdtemp(path.join(os.tmpdir(), "streetlens-"))

  try {
    let extractedCount = 0
    for (const [runIndex, run] of splitIntoRuns(sortedFrames).entries()) {
      const firstFrame = run[0].frameIndex
      const filterPath = path.join(filterDir, `filter-${runIndex}.txt`)
      await fs.writeFile(
        filterPath,
        buildMaxStitchFilter(
          `select=${buildSelectExpression(run.map((frame) => frame.frameIndex - firstFrame))}`,
          !!vaapiDevice,
        ),
      )

      await runCmd("ffmpeg", [
        "-hide_banner",
        "-nostdin",
        "-v",
        "error",
        "-y",
        ...hwaccelOptions(vaapiDevice),
        "-seek_timestamp",
        "1",
        "-ss",
        Math.max(0, run[0].videoTime - SEEK_LEAD_SECONDS).toFixed(6),
        "-i",
        videoPath,
        "-filter_complex_script",
        filterPath,
        "-map",
        "[v]",
        "-fps_mode",
        "passthrough",
        "-frames:v",
        String(run.length),
        "-qscale:v",
        "1",
        "-qmin",
        "1",
        "-start_number",
        String(extractedCount + 1),
        path.join(outDir, `${prefix}_%06d.jpg`),
      ])

      extractedCount += run.length
    }
  } finally {
    await fs.rm(filterDir, { recursive: true, force: true })
  }

  const imagePaths = sortedFrames.map((_, i) =>
    path.join(outDir, `${prefix}_${String(i + 1).padStart(6, "0")}.jpg`),
  )

  await Promise.all(imagePaths.map((imagePath) => fs.access(imagePath)))
  return imagePaths
}

export function splitIntoRuns(
  sortedFrames: FrameToExtract[],
  maxGapSeconds = MAX_DECODE_GAP_SECONDS,
): FrameToExtract[][] {
  const runs: FrameToExtract[][] = []

  for (const frame of sortedFrames) {
    const currentRun = runs.at(-1)
    const previous = currentRun?.at(-1)
    if (previous && frame.videoTime - previous.videoTime <= maxGapSeconds) {
      currentRun.push(frame)
    } else {
      runs.push([frame])
    }
  }

  return runs
}

function hwaccelOptions(vaapiDevice: string | undefined): string[] {
  return vaapiDevice
    ? [
        "-hwaccel:v",
        "vaapi",
        "-hwaccel_device:v",
        vaapiDevice,
        "-hwaccel_output_format:v",
        "vaapi",
      ]
    : []
}

export function buildSelectExpression(sortedIndices: number[]): string {
  if (sortedIndices.length === 0) return "0"
  if (sortedIndices.length === 1) return `eq(n\\,${sortedIndices[0]})`

  const middle = Math.floor(sortedIndices.length / 2)
  return `if(lt(n\\,${sortedIndices[middle]})\\,${buildSelectExpression(sortedIndices.slice(0, middle))}\\,${buildSelectExpression(sortedIndices.slice(middle))})`
}

function buildMaxStitchFilter(selectFilter: string, vaapi: boolean): string {
  const seamExpression =
    "if(between(X, 0, 64), " +
    "(p((X+64),Y)*(((X+1))/65))" +
    "+(p(X,Y)*((65-((X+1)))/65)), p(X,Y))"
  const seamFilter = ["lum", "cb", "cr", "a"]
    .map((plane) => `${plane}='${seamExpression}'`)
    .join(":")

  // Convert after each crop to keep chroma sampling correct at the seams.
  const sections = [
    "crop=624:1344:x=0:y=0,format=yuvj420p",
    "crop=128:1344:x=624:y=0,format=yuvj420p",
    "crop=624:1344:x=752:y=0,format=yuvj420p",
    "crop=1344:1344:x=1376:y=0",
    "crop=624:1344:x=2720:y=0,format=yuvj420p",
    "crop=128:1344:x=3344:y=0,format=yuvj420p",
    "crop=624:1344:x=3472:y=0,format=yuvj420p",
  ]
  const seamSections = [1, 5]
  const downloadFilter = vaapi ? ",hwdownload,format=nv12,format=yuv420p" : ""

  const filters: string[] = []
  for (const [row, streamIndex, interpolation] of [
    ["bottom", MAX_LENS_STREAMS[0], "b"],
    ["top", MAX_LENS_STREAMS[1], "n"],
  ] as const) {
    const splitOutputs = sections.map((_, i) => `[${row}_input_${i}]`).join("")
    filters.push(
      `[0:${streamIndex}]${selectFilter}${downloadFilter},split=7${splitOutputs}`,
    )

    sections.forEach((section, index) => {
      const seam = seamSections.includes(index)
        ? `,geq=${seamFilter}:interpolation=${interpolation},crop=64:1344:x=0:y=0,format=yuvj420p,scale=96:1344`
        : ""
      filters.push(
        `[${row}_input_${index}]${section}${seam}[${row}_section_${index}]`,
      )
    })

    const stackInputs = sections.map((_, i) => `[${row}_section_${i}]`).join("")
    filters.push(`${stackInputs}hstack=inputs=7[${row}]`)
  }

  filters.push(
    "[bottom][top]vstack[complete];" +
      "[complete]v360=eac:e:interp=cubic,crop=4032:2388:x=0:y=0[v]",
  )

  return filters.join(";\n")
}
