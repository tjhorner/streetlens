<script lang="ts" context="module">
  export interface TrackProps {
    name: string
    captureDate: number
    filePath: string
    fileHash: string
    hasImages: boolean
  }
</script>

<script lang="ts">
  import type { FeatureCollection, Feature, Geometry } from "geojson"
  import TrackExplorerMap from "./TrackExplorerMap.svelte"
  import { onMount } from "svelte"
  import { goto } from "$app/navigation"
  import { resolve } from "$app/paths"

  export let trackId: string | undefined = undefined
  export let imageId: string | undefined = undefined

  let tracks: FeatureCollection<Geometry, TrackProps> = {
    type: "FeatureCollection",
    features: [],
  }

  $: selectedTrack = tracks.features.find((track) => String(track.id) === trackId) ?? null

  function navigate(trackId?: string | number, imageId?: string | number) {
    let path: string

    if (trackId === undefined) {
      path = resolve("/(explorer)")
    } else if (imageId === undefined) {
      path = resolve("/(explorer)/track/[trackId]", {
        trackId: String(trackId),
      })
    } else {
      path = resolve("/(explorer)/track/[trackId]/image/[imageId]", {
        trackId: String(trackId),
        imageId: String(imageId),
      })
    }

    goto(path, { noScroll: true, keepFocus: true })
  }

  async function load() {
    const params = new URLSearchParams({
      format: "geojson",
      order: "ASC",
    }).toString()

    const response = await fetch(`/api/tracks?${params}`)
    const resp = (await response.json()) as FeatureCollection<
      Geometry,
      TrackProps
    >

    resp.features = resp.features.filter(
      (track) => track.geometry.type === "MultiLineString"
        ? track.geometry.coordinates.some((line) => line.length > 1)
        : (track.geometry as any).coordinates?.length > 1
    )

    resp.features.forEach((track) => {
      track.properties.captureDate = new Date(
        track.properties.captureDate
      ).getTime()
    })

    tracks = resp
  }

  onMount(() => {
    load()
  })
</script>

<TrackExplorerMap
  {tracks}
  {selectedTrack}
  {imageId}
  on:selectTrack={({ detail }) => navigate(detail?.id)}
  on:selectImage={({ detail }) => navigate(selectedTrack?.id, detail ?? undefined)}
/>
