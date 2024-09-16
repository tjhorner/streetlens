import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class NotificationTarget {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  appriseUrl: string
}
