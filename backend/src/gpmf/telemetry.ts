import { runCmdForBuffer } from "src/util/run-command"
import { GpmfEntry, parseKlv } from "./klv"

export interface GpmfPacket {
  /** Seconds from the start of the video */
  time: number
  duration: number
  entries: GpmfEntry[]
}

/** Reads the GPMF ("gpmd") track of a GoPro video, one packet per payload (usually ~1s). */
export async function readGpmfPackets(
  videoPath: string,
): Promise<GpmfPacket[]> {
  const streamIndex = await findGpmfStreamIndex(videoPath)

  const packetList = await runCmdForBuffer("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    String(streamIndex),
    "-show_entries",
    "packet=pts_time,duration_time,size",
    "-of",
    "csv=p=0",
    videoPath,
  ])

  const data = await runCmdForBuffer("ffmpeg", [
    "-v",
    "error",
    "-i",
    videoPath,
    "-map",
    `0:${streamIndex}`,
    "-c",
    "copy",
    "-f",
    "data",
    "-",
  ])

  return splitPackets(packetList.toString(), data)
}

export function splitPackets(packetList: string, data: Buffer): GpmfPacket[] {
  const packets: GpmfPacket[] = []
  let offset = 0

  for (const line of packetList.trim().split("\n")) {
    const [time, duration, size] = line.split(",").map(Number)
    const payload = data.subarray(offset, offset + size)
    offset += size

    packets.push({ time, duration, entries: parseKlv(payload) })
  }

  if (offset !== data.length) {
    throw new Error(
      `GPMF packet sizes (${offset} bytes) don't match extracted data (${data.length} bytes)`,
    )
  }

  return packets
}

async function findGpmfStreamIndex(videoPath: string): Promise<number> {
  const output = await runCmdForBuffer("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "stream=index,codec_tag_string",
    "-of",
    "csv=p=0",
    videoPath,
  ])

  const gpmdLine = output
    .toString()
    .trim()
    .split("\n")
    .find((line) => line.split(",")[1] === "gpmd")

  if (!gpmdLine) {
    throw new Error("Video has no GPMF telemetry track")
  }

  return parseInt(gpmdLine.split(",")[0], 10)
}
