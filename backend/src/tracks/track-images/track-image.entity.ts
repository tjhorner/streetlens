import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  Point,
  PrimaryGeneratedColumn,
} from "typeorm"
import { Track } from "../track.entity"
import { feature } from "@turf/helpers"
import { UNVERSIONED_PROCESSOR_VERSION } from "../processor-version"

@Entity()
export class TrackImage {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  sequenceNumber: number

  @CreateDateColumn()
  importDate: Date

  @Column()
  captureDate: Date

  @Column("geometry")
  location: Point

  @Column("decimal")
  heading?: number

  @Column()
  filePath: string

  @Column({ default: UNVERSIONED_PROCESSOR_VERSION })
  processorVersion: number

  @ManyToOne(() => Track, (track) => track.images)
  track: Track

  toGeoJSON() {
    return feature(
      this.location,
      {
        sequenceNumber: this.sequenceNumber,
        captureDate: this.captureDate,
        heading: this.heading,
      },
      {
        id: this.id,
      },
    )
  }
}
