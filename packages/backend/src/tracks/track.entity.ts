import {
  Column,
  Entity,
  Feature,
  LineString,
  PrimaryGeneratedColumn,
} from "typeorm"

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
