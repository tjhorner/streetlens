import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { FileWatcherService } from "./tracks/file-watcher.service"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)

  const fileWatcher = app.get(FileWatcherService)
  await fileWatcher.watchAll()
}

bootstrap()
