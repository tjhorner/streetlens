// GoPro Metadata Format: https://github.com/gopro/gpmf-parser

export interface GpmfEntry {
  key: string
  type: string
  structSize: number
  repeat: number
  payload: Buffer
  children?: GpmfEntry[]
}

const NESTED_TYPE = "\0"

const NUMERIC_READERS: Record<
  string,
  { size: number; read: (buf: Buffer, offset: number) => number }
> = {
  b: { size: 1, read: (buf, offset) => buf.readInt8(offset) },
  B: { size: 1, read: (buf, offset) => buf.readUInt8(offset) },
  s: { size: 2, read: (buf, offset) => buf.readInt16BE(offset) },
  S: { size: 2, read: (buf, offset) => buf.readUInt16BE(offset) },
  l: { size: 4, read: (buf, offset) => buf.readInt32BE(offset) },
  L: { size: 4, read: (buf, offset) => buf.readUInt32BE(offset) },
  f: { size: 4, read: (buf, offset) => buf.readFloatBE(offset) },
  d: { size: 8, read: (buf, offset) => buf.readDoubleBE(offset) },
  j: { size: 8, read: (buf, offset) => Number(buf.readBigInt64BE(offset)) },
  J: { size: 8, read: (buf, offset) => Number(buf.readBigUInt64BE(offset)) },
}

export function parseKlv(buf: Buffer): GpmfEntry[] {
  const entries: GpmfEntry[] = []
  let offset = 0

  while (offset + 8 <= buf.length) {
    const key = buf.toString("latin1", offset, offset + 4)
    const type = buf.toString("latin1", offset + 4, offset + 5)
    const structSize = buf.readUInt8(offset + 5)
    const repeat = buf.readUInt16BE(offset + 6)
    const length = structSize * repeat
    const payload = buf.subarray(offset + 8, offset + 8 + length)

    const entry: GpmfEntry = { key, type, structSize, repeat, payload }
    if (type === NESTED_TYPE) {
      entry.children = parseKlv(payload)
    }

    entries.push(entry)
    offset += 8 + alignTo4(length)
  }

  return entries
}

/** Each row is one sample; a row has structSize / elementSize values. */
export function readNumbers(entry: GpmfEntry): number[][] {
  const reader = NUMERIC_READERS[entry.type]
  if (!reader) {
    throw new Error(
      `Unsupported numeric GPMF type "${entry.type}" (${entry.key})`,
    )
  }

  const valuesPerRow = entry.structSize / reader.size
  const rows: number[][] = []
  for (let row = 0; row < entry.repeat; row++) {
    const values: number[] = []
    for (let i = 0; i < valuesPerRow; i++) {
      const offset = row * entry.structSize + i * reader.size
      values.push(reader.read(entry.payload, offset))
    }
    rows.push(values)
  }

  return rows
}

export function readString(entry: GpmfEntry): string {
  return entry.payload.toString("latin1").replace(/\0+$/, "")
}

/** Parses a "U" (yymmddhhmmss.sss, UTC) value. */
export function readDate(entry: GpmfEntry): Date {
  const match = readString(entry).match(
    /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}\.\d{3})$/,
  )
  if (!match) return undefined

  const [, yy, mm, dd, hh, min, ss] = match
  return new Date(`20${yy}-${mm}-${dd}T${hh}:${min}:${ss}Z`)
}

/** Walks DEVC > STRM containers and yields each stream's entries. */
export function* streams(entries: GpmfEntry[]): Generator<GpmfEntry[]> {
  for (const entry of entries) {
    if (entry.key === "DEVC" && entry.children) {
      yield* streams(entry.children)
    } else if (entry.key === "STRM" && entry.children) {
      yield entry.children
    }
  }
}

function alignTo4(length: number) {
  return (length + 3) & ~3
}
