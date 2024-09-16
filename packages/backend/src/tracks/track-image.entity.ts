import {
  Column,
  Entity,
  Feature,
  ManyToOne,
  Point,
  PrimaryGeneratedColumn,
} from "typeorm"
import { Track } from "./track.entity"

@Entity()
export class TrackImage {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  sequenceNumber: number

  @Column()
  captureDate: Date

  @Column("geometry")
  location: Point

  @Column("decimal")
  heading?: number

  @Column()
  filePath: string

  @ManyToOne(() => Track, (track) => track.images)
  track: Track

  toGeoJSON(): Feature {
    return {
      type: "Feature",
      id: this.id,
      properties: {
        sequenceNumber: this.sequenceNumber,
        captureDate: this.captureDate,
        heading: this.heading,
      },
      geometry: this.location,
    }
  }
}
