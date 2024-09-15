import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TracksModule } from "./tracks/tracks.module"
import { BullModule } from "@nestjs/bullmq"
import { ExpressAdapter } from "@bull-board/express"
import { BullBoardModule } from "@bull-board/nestjs"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { ImportDirectoriesModule } from "./import-directories/import-directories.module"
import { TrackWatcherService } from "./track-watcher.service"

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? "localhost",
        port: parseInt(process.env.REDIS_PORT ?? "6379"),
      },
    }),
    BullBoardModule.forRoot({
      route: "/queues",
      adapter: ExpressAdapter,
    }),
    TracksModule,
    ImportDirectoriesModule,
  ],
  providers: [TrackWatcherService],
})
export class AppModule {}
