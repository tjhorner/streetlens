export interface MapillaryImageDescription {
  /**
   * Absolute path of the video
   *
   * Absolute path of the image
   */
  filename: string
  /**
   * The video file type
   *
   * The image file type
   */
  filetype: Filetype
  /**
   * Device make, e.g. GoPro, BlackVue, Insta360
   */
  MAPDeviceMake?: string
  /**
   * Device model, e.g. HERO10 Black, DR900S-1CH, Insta360 Titan
   */
  MAPDeviceModel?: string
  MAPGPSTrack?: Array<any[]>
  /**
   * MD5 checksum of the video content. If not provided, the uploader will compute it
   *
   * MD5 checksum of the image content. If not provided, the uploader will compute it
   */
  md5sum?: null | string
  /**
   * Altitude of the image, in meters
   */
  MAPAltitude?: number
  MAPCameraUUID?: string
  /**
   * Capture time of the image
   */
  MAPCaptureTime?: string
  /**
   * Camera angle of the image, in degrees. If null, the angle will be interpolated
   */
  MAPCompassHeading?: MAPCompassHeading
  /**
   * The base filename of the image
   */
  MAPFilename?: string
  MAPGPSAccuracyMeters?: number
  /**
   * Latitude of the image
   */
  MAPLatitude?: number
  /**
   * Longitude of the image
   */
  MAPLongitude?: number
  MAPMetaTags?: { [key: string]: any }
  MAPOrientation?: number
  /**
   * Arbitrary key for grouping images
   */
  MAPSequenceUUID?: string
}

/**
 * Camera angle of the image, in degrees. If null, the angle will be interpolated
 */
export interface MAPCompassHeading {
  MagneticHeading: number
  TrueHeading: number
}

/**
 * The video file type
 *
 * The image file type
 */
export enum Filetype {
  Blackvue = "blackvue",
  Camm = "camm",
  Gopro = "gopro",
  Image = "image",
  Video = "video",
}
