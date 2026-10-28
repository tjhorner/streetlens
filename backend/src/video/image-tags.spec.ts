import { buildTags } from "./image-tags"

const frame = {
  frameIndex: 0,
  videoTime: 0,
  time: new Date("2026-08-11T05:20:32.264Z"),
  latitude: 47.8371,
  longitude: -122.2367,
  altitude: 120.5,
  heading: 359.16,
}

describe("buildTags", () => {
  it("records UTC capture time, position, heading and panorama tags", () => {
    expect(buildTags(frame, "GoPro Max")).toMatchObject({
      Model: "GoPro Max",
      DateTimeOriginal: "2026:08:11 05:20:32",
      SubSecTimeOriginal: "264",
      OffsetTimeOriginal: "+00:00",
      GPSDateStamp: "2026:08:11",
      GPSTimeStamp: "05:20:32.264",
      GPSLatitude: 47.8371,
      GPSLongitude: -122.2367,
      GPSImgDirection: 359.16,
      "XMP-GPano:ProjectionType": "equirectangular",
      "XMP-GPano:PoseHeadingDegrees": 359.16,
    })
  })

  it("leaves out heading tags when the heading is unknown", () => {
    const tags = buildTags({ ...frame, heading: undefined }, "GoPro Max")

    expect(tags).not.toHaveProperty("GPSImgDirection")
    expect(tags).not.toHaveProperty("XMP-GPano:PoseHeadingDegrees")
  })
})
