import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class ImportDirectory {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  directoryPath: string
}
