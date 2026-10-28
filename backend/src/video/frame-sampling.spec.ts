import { GpsSample } from "../gpmf/gps"
import { sampleFramesByDistance } from "./frame-sampling"
import {
  buildRotationCommands,
  buildSelectExpression,
  splitIntoRuns,
} from "./frame-extraction"

const METERS_PER_DEGREE_LATITUDE = 111195

/** A straight drive north at 10 m/s, one GPS sample per second. */
function driveNorth(seconds: number, startTime = 0): GpsSample[] {
  return Array.from({ length: seconds + 1 }, (_, i) => ({
    videoTime: startTime + i,
    time: new Date(Date.UTC(2026, 7, 11, 5, 0, startTime + i)),
    latitude: 47 + (i * 10) / METERS_PER_DEGREE_LATITUDE,
    longitude: -122,
    altitude: 100,
    speed: 10,
  }))
}

/** 30 frames per second */
function frameTimes(seconds: number) {
  return Array.from({ length: seconds * 30 }, (_, i) => i / 30)
}

describe("sampleFramesByDistance", () => {
  it("selects frames more than sampleDistance apart", () => {
    const frames = sampleFramesByDistance([driveNorth(5)], frameTimes(5), {
      sampleDistance: 9.5,
    })

    // 9.5 m at 10 m/s is passed at 0.95 s, so frame 29 (0.967 s) is the first one past it
    expect(frames.map((frame) => frame.frameIndex)).toEqual([
      0, 29, 58, 87, 116, 145,
    ])
    expect(frames[1].time.getTime()).toBe(Date.UTC(2026, 7, 11, 5, 0, 0, 966))
    expect(frames[1].heading).toBeCloseTo(0)
  })

  it("skips frames outside GPS segments", () => {
    const frames = sampleFramesByDistance([driveNorth(2, 3)], frameTimes(10))

    expect(frames[0].frameIndex).toBe(90)
    expect(frames.at(-1).videoTime).toBeLessThanOrEqual(5)
  })

  it("keeps the previous heading when not moving", () => {
    const moving = driveNorth(2)
    const stopped = Array.from({ length: 20 }, (_, i) => ({
      ...moving.at(-1),
      videoTime: 3 + i,
    }))

    const frames = sampleFramesByDistance(
      [[...moving, ...stopped]],
      frameTimes(22),
      { sampleDistance: 0 },
    )

    expect(frames.at(-1).heading).toBeCloseTo(0)
  })
})

describe("buildSelectExpression", () => {
  it("builds a binary search over frame numbers", () => {
    expect(buildSelectExpression([])).toBe("0")
    expect(buildSelectExpression([4])).toBe("eq(n\\,4)")
    expect(buildSelectExpression([1, 5, 9])).toBe(
      "if(lt(n\\,5)\\,eq(n\\,1)\\,if(lt(n\\,9)\\,eq(n\\,5)\\,eq(n\\,9)))",
    )
  })
})

describe("splitIntoRuns", () => {
  it("starts a new run when frames are more than maxGapSeconds apart", () => {
    const frames = [0, 1.5, 3, 20, 21.5, 40].map((videoTime) => ({
      frameIndex: Math.round(videoTime * 30),
      videoTime,
    }))

    expect(
      splitIntoRuns(frames, 10).map((run) => run.map((f) => f.videoTime)),
    ).toEqual([[0, 1.5, 3], [20, 21.5], [40]])
  })
})

describe("buildRotationCommands", () => {
  it("resets the rotation before setting each frame's angles", () => {
    expect(
      buildRotationCommands([
        {
          frameIndex: 0,
          videoTime: 1,
          rotation: { yaw: 10, pitch: -5, roll: 2.5 },
        },
        { frameIndex: 30, videoTime: 2 },
      ]),
    ).toBe(
      "0.990000 v360@rotate reset_rot 1, v360@rotate yaw 10.000, v360@rotate pitch -5.000, v360@rotate roll 2.500;\n" +
        "1.990000 v360@rotate reset_rot 1, v360@rotate yaw 0.000, v360@rotate pitch 0.000, v360@rotate roll 0.000;",
    )
  })
})
