import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { existsSync } from "fs"
import sirv from "sirv"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix("api")

  if (process.env.FRONTEND_ROOT && existsSync(process.env.FRONTEND_ROOT)) {
    console.log(`Serving frontend from ${process.env.FRONTEND_ROOT}`)
    app.use(
      sirv(process.env.FRONTEND_ROOT, {
        etag: true,
        gzip: true,
        brotli: true,
        setHeaders: (res, pathname) => {
          if (
            pathname.startsWith(`/_app/immutable`) &&
            res.statusCode === 200
          ) {
            res.setHeader("cache-control", "public,max-age=31536000,immutable")
          }
        },
      }),
    )
  }

  await app.listen(3000)
}

bootstrap()
