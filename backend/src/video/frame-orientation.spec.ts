import { OrientationSample, Quaternion } from "../gpmf/orientation"
import { computeFrameRotations } from "./frame-orientation"

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Camera turned around its vertical (y) axis */
function turned(degrees: number): Quaternion {
  const half = toRadians(degrees) / 2
  return [Math.cos(half), 0, Math.sin(half), 0]
}

function sample(
  videoTime: number,
  { pitch = 0, turn = 0 } = {},
): OrientationSample {
  return {
    videoTime,
    gravity: [0, Math.cos(toRadians(pitch)), Math.sin(toRadians(pitch))],
    orientation: turned(turn),
  }
}

describe("computeFrameRotations", () => {
  it("levels pitch from gravity", () => {
    const [rotation] = computeFrameRotations(
      [{ videoTime: 0, heading: 0 }],
      [sample(0, { pitch: -16 })],
    )

    expect(rotation.pitch).toBeCloseTo(-16)
    expect(rotation.roll).toBeCloseTo(0)
  })

  it("turns a brief head turn back to the direction of travel", () => {
    const frames = Array.from({ length: 9 }, (_, i) => ({
      videoTime: i,
      heading: 90,
    }))
    const samples = frames.map((_, i) => sample(i, { turn: i === 4 ? 60 : 0 }))

    const yaws = computeFrameRotations(frames, samples).map((r) => r.yaw)

    expect(Math.abs(yaws[4])).toBeCloseTo(60)
    yaws.filter((_, i) => i !== 4).forEach((yaw) => expect(yaw).toBeCloseTo(0))
  })

  it("does not rotate without orientation data", () => {
    expect(computeFrameRotations([{ videoTime: 0, heading: 0 }], [])).toEqual([
      { yaw: 0, pitch: 0, roll: 0 },
    ])
  })
})
