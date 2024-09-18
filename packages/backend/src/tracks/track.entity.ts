import {
  Column,
  Entity,
  Feature,
  LineString,
  OneToMany,
  PrimaryGeneratedColumn,
  VirtualColumn,
} from "typeorm"
import { TrackImage } from "./track-image.entity"

@Entity()
export class Track {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  captureDate: Date

  @Column()
  filePath: string

  @Column()
  fileHash: string

  @Column("geometry")
  geometry: LineString

  @VirtualColumn({
    type: "bool",
    query: (alias) =>
      `SELECT EXISTS (SELECT 1 FROM track_image WHERE track_image."trackId" = ${alias}.id)`,
  })
  hasImages: boolean

  @OneToMany(() => TrackImage, (image) => image.track)
  images: TrackImage[]

  toGeoJSON(): Feature {
    return {
      type: "Feature",
      id: this.id,
      properties: {
        name: this.name,
        captureDate: this.captureDate,
        filePath: this.filePath,
        fileHash: this.fileHash,
        hasImages: this.hasImages,
      },
      geometry: this.geometry,
    }
  }
}
