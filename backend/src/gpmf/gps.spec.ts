import { parseKlv, readDate, readNumbers } from "./klv"
import { extractGpsSamples } from "./gps"
import { GpmfPacket } from "./telemetry"

function klv(key: string, type: string, structSize: number, values: Buffer) {
  const header = Buffer.alloc(8)
  header.write(key, 0, "latin1")
  header.write(type, 4, "latin1")
  header.writeUInt8(structSize, 5)
  header.writeUInt16BE(values.length / structSize, 6)
  const padding = Buffer.alloc((4 - (values.length % 4)) % 4)
  return Buffer.concat([header, values, padding])
}

function nested(key: string, ...children: Buffer[]) {
  const payload = Buffer.concat(children)
  const header = Buffer.alloc(8)
  header.write(key, 0, "latin1")
  header.writeUInt8(1, 5)
  header.writeUInt16BE(payload.length, 6)
  return Buffer.concat([header, payload])
}

function int32s(...values: number[]) {
  const buf = Buffer.alloc(values.length * 4)
  values.forEach((value, i) => buf.writeInt32BE(value, i * 4))
  return buf
}

function gpsPacket(
  time: number,
  { fix = 3, dop = 150, points = [[47.5, -122.25, 100, 5, 5]] } = {},
): GpmfPacket {
  const scale = [10000000, 10000000, 1000, 1000, 100]
  const gps5 = Buffer.concat(
    points.map((point) =>
      int32s(...point.map((value, i) => Math.round(value * scale[i]))),
    ),
  )

  const buf = nested(
    "DEVC",
    nested(
      "STRM",
      klv("GPSF", "L", 4, int32s(fix)),
      klv("GPSU", "U", 16, Buffer.from("260811051630.280", "latin1")),
      klv("GPSP", "S", 2, Buffer.from([dop >> 8, dop & 0xff])),
      klv("SCAL", "l", 4, int32s(...scale)),
      klv("GPS5", "l", 20, gps5),
    ),
  )

  return { time, duration: 1, entries: parseKlv(buf) }
}

describe("parseKlv", () => {
  it("parses nested entries and skips padding", () => {
    const entries = parseKlv(
      nested(
        "STRM",
        klv("STNM", "c", 1, Buffer.from("GPS")),
        klv("TSMP", "L", 4, int32s(7)),
      ),
    )

    expect(entries[0].key).toBe("STRM")
    expect(entries[0].children.map((entry) => entry.key)).toEqual([
      "STNM",
      "TSMP",
    ])
    expect(readNumbers(entries[0].children[1])).toEqual([[7]])
  })

  it("reads GPSU dates", () => {
    const [entry] = parseKlv(
      klv("GPSU", "U", 16, Buffer.from("260811051630.280", "latin1")),
    )
    expect(readDate(entry)).toEqual(new Date("2026-08-11T05:16:30.280Z"))
  })
})

describe("extractGpsSamples", () => {
  it("scales values and spreads samples across the packet duration", () => {
    const samples = extractGpsSamples([
      gpsPacket(10, {
        points: [
          [47.5, -122.25, 100, 5, 5],
          [47.6, -122.35, 101, 6, 6],
        ],
      }),
    ])

    expect(samples).toEqual([
      {
        videoTime: 10,
        time: new Date("2026-08-11T05:16:30.280Z"),
        latitude: 47.5,
        longitude: -122.25,
        altitude: 100,
        speed: 5,
      },
      {
        videoTime: 10.5,
        time: new Date("2026-08-11T05:16:30.780Z"),
        latitude: 47.6,
        longitude: -122.35,
        altitude: 101,
        speed: 6,
      },
    ])
  })

  it("drops packets without a fix or with high DOP, and empty points", () => {
    const samples = extractGpsSamples([
      gpsPacket(0, { fix: 0 }),
      gpsPacket(1, { dop: 1500 }),
      gpsPacket(2, { points: [[0, 0, 0, 0, 0]] }),
      gpsPacket(3),
    ])

    expect(samples.map((sample) => sample.videoTime)).toEqual([3])
  })
})
