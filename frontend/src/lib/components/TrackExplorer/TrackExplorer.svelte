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
  import type { FeatureCollection, Feature, LineString } from "geojson"
  import TrackExplorerMap from "./TrackExplorerMap.svelte"
  import { onMount } from "svelte"

  let tracks: FeatureCollection<LineString, TrackProps> = {
    type: "FeatureCollection",
    features: [],
  }

  let selectedTrack: Feature<LineString, TrackProps> | null = null

  const filters: { [key: string]: any } = {
    start: new Date(0),
    end: new Date(),
  }

  async function load() {
    const params = new URLSearchParams({
      format: "geojson",
      order: "ASC",
    }).toString()

    const response = await fetch(`/api/tracks?${params}`)
    const resp = (await response.json()) as FeatureCollection<
      LineString,
      TrackProps
    >

    resp.features = resp.features.filter(
      (track) => track.geometry.coordinates.length > 1
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

<TrackExplorerMap {tracks} bind:selectedTrack />
