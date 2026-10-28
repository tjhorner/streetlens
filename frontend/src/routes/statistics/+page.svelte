<script lang="ts">
  import { onMount } from "svelte"
  import * as Card from "$lib/components/ui/card"
  import { Button } from "$lib/components/ui/button"

  interface StorageStatistics {
    bytes: number
    files: number
    unavailableFiles: number
  }

  interface Statistics {
    tracks: number
    images: number
    distanceMeters: number
    tracksWithImages: number
    firstCaptureDate: string | null
    lastCaptureDate: string | null
    lastImportDate: string | null
    storage: { images: StorageStatistics; videos: StorageStatistics }
    generatedAt: string
  }

  let statistics: Statistics | null = null
  let loading = true
  let error = ""
  const mediaKinds: ("images" | "videos")[] = ["images", "videos"]

  const number = (value: number, maximumFractionDigits = 0) =>
    value.toLocaleString(undefined, { maximumFractionDigits })
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : "—"
  function bytes(value: number) {
    if (!value) return "0 B"
    const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4)
    return `${number(value / 1024 ** unit, 1)} ${["B", "KiB", "MiB", "GiB", "TiB"][unit]}`
  }

  async function load() {
    loading = true
    error = ""
    try {
      const response = await fetch("/api/statistics")
      if (!response.ok) throw new Error("Unable to load statistics. Please try again.")
      statistics = await response.json()
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Unable to load statistics."
    } finally {
      loading = false
    }
  }

  onMount(load)
  $: totalBytes = statistics ? statistics.storage.images.bytes + statistics.storage.videos.bytes : 0
  $: imageShare = totalBytes && statistics ? statistics.storage.images.bytes / totalBytes * 100 : 0
</script>

<svelte:head>
  <title>Statistics · StreetLens</title>
</svelte:head>

<div class="container py-8 flex flex-col gap-6" aria-busy={loading}>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1>Statistics</h1>
    <Button variant="outline" on:click={load} disabled={loading}>
      {loading ? "Loading…" : "Refresh"}
    </Button>
  </div>

  {#if error}
    <div role="alert" class="rounded-lg border border-destructive p-4 text-destructive">{error}</div>
  {/if}

  {#if statistics}
    {#if statistics.tracks === 0}
      <div class="text-muted-foreground">No tracks imported yet.</div>
    {/if}

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each [
        { label: "Miles imported", value: number(statistics.distanceMeters / 1609.344, 1), detail: `${number(statistics.distanceMeters / 1000, 1)} km of recorded tracks` },
        { label: "Images imported", value: number(statistics.images), detail: "Extracted image records" },
        { label: "Tracks imported", value: number(statistics.tracks), detail: `${number(statistics.tracksWithImages)} with images` },
        { label: "Media storage", value: bytes(totalBytes), detail: "Source videos + extracted images" },
      ] as metric}
        <Card.Root>
          <Card.Header><Card.Description>{metric.label}</Card.Description></Card.Header>
          <Card.Content>
            <div class="text-3xl font-bold tabular-nums">{metric.value}</div>
            <div class="mt-2 text-sm text-muted-foreground">{metric.detail}</div>
          </Card.Content>
        </Card.Root>
      {/each}
    </div>

    <Card.Root>
      <Card.Header>
        <Card.Title>File size breakdown</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="mb-6 flex h-4 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div class="bg-blue-500" style:width={`${imageShare}%`}></div>
          <div class="bg-violet-500" style:width={`${totalBytes ? 100 - imageShare : 0}%`}></div>
        </div>
        <dl class="grid gap-6 sm:grid-cols-2">
          {#each mediaKinds as kind}
            {@const storage = statistics.storage[kind]}
            <div>
              <dt class="flex items-center gap-2 font-medium">
                <span class={`h-3 w-3 rounded-full ${kind === "images" ? "bg-blue-500" : "bg-violet-500"}`}></span>
                {kind === "images" ? "Extracted images" : "Source videos"}
              </dt>
              <dd class="mt-2 text-2xl font-semibold">{bytes(storage.bytes)}</dd>
              <dd class="mt-1 text-sm text-muted-foreground">
                {number(storage.files)} files &bull; {number(totalBytes ? storage.bytes / totalBytes * 100 : 0, 1)}% of media storage
              </dd>
              {#if storage.unavailableFiles}
                <dd class="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  {number(storage.unavailableFiles)} missing or unreadable files excluded from size totals.
                </dd>
              {/if}
            </div>
          {/each}
        </dl>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header><Card.Title>Library overview</Card.Title></Card.Header>
      <Card.Content>
        <dl class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {#each [
            { label: "First capture", value: date(statistics.firstCaptureDate) },
            { label: "Latest capture", value: date(statistics.lastCaptureDate) },
            { label: "Latest import", value: statistics.lastImportDate ? new Date(statistics.lastImportDate).toLocaleString() : "—" },
            { label: "Tracks without images", value: number(statistics.tracks - statistics.tracksWithImages) },
            { label: "Average track length", value: statistics.tracks ? `${number(statistics.distanceMeters / statistics.tracks / 1609.344, 1)} mi` : "—" },
            { label: "Images per mile", value: statistics.distanceMeters > 0 ? number(statistics.images / (statistics.distanceMeters / 1609.344), 1) : "—" },
          ] as metric}
            <div>
              <dt class="text-sm text-muted-foreground">{metric.label}</dt>
              <dd class="mt-1 font-semibold">{metric.value}</dd>
            </div>
          {/each}
        </dl>
      </Card.Content>
    </Card.Root>
    <div class="text-sm text-muted-foreground">
      Calculated {new Date(statistics.generatedAt).toLocaleString()}. Results are cached for one minute.
    </div>
  {:else if loading}
    <div role="status" class="text-muted-foreground">Calculating statistics and checking media files…</div>
  {/if}
</div>
