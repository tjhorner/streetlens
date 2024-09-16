import {
  Column,
  Entity,
  Feature,
  LineString,
  OneToMany,
  PrimaryGeneratedColumn,
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
      },
      geometry: this.geometry,
    }
  }
}
