import { IsDate, IsOptional, IsString } from "class-validator"

export class ListTracksDto {
  @IsDate()
  @IsOptional()
  start?: Date

  @IsDate()
  @IsOptional()
  end?: Date

  @IsString()
  @IsOptional()
  bbox?: string

  @IsString()
  @IsOptional()
  order?: "ASC" | "DESC"

  @IsString()
  @IsOptional()
  format?: "geojson"
}
