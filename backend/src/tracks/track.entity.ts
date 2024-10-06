import {
  Column,
  CreateDateColumn,
  Entity,
  LineString,
  OneToMany,
  PrimaryGeneratedColumn,
  VirtualColumn,
} from "typeorm"
import { TrackImage } from "./track-images/track-image.entity"
import { feature } from "@turf/helpers"

@Entity()
export class Track {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @CreateDateColumn()
  importDate: Date

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

  toGeoJSON() {
    return feature(
      this.geometry,
      {
        name: this.name,
        captureDate: this.captureDate,
        filePath: this.filePath,
        fileHash: this.fileHash,
        hasImages: this.hasImages,
      },
      {
        id: this.id,
      },
    )
  }
}
