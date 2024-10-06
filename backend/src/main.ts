import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { existsSync } from "fs"
import sirv from "sirv"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix("api")
  app.enableCors()

  const config = new DocumentBuilder()
    .setTitle("Streetlens API")
    .setVersion("1.0")
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("swagger", app, document)

  if (process.env.FRONTEND_ROOT && existsSync(process.env.FRONTEND_ROOT)) {
    console.log(`Serving frontend from ${process.env.FRONTEND_ROOT}`)
    app.use(
      sirv(process.env.FRONTEND_ROOT, {
        etag: true,
        gzip: true,
        brotli: true,
        single: true,
        ignores: ["/api/*"],
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
