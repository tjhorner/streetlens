<script lang="ts">
  import bbox from "@turf/bbox"
  import type { Feature, FeatureCollection } from "geojson"
  import { onMount } from "svelte"
  import {
    MapLibre,
    GeoJSON,
    LineLayer,
    Control,
    Popup,
    type LayerClickInfo,
  } from "svelte-maplibre"
  import flush from "just-flush"
  import DateFilter from "./DateFilter.svelte"

  let selectedTrack: Feature | undefined

  let minDate: number = Number.MAX_SAFE_INTEGER
  let maxDate: number = 0

  let map: maplibregl.Map
  let data: FeatureCollection = {
    type: "FeatureCollection",
    features: [],
  }

  const filters: { [key: string]: any } = {
    start: new Date(0),
    end: new Date(),
  }

  function serializeFilters() {
    return {
      start: filters.start.toISOString(),
      end: filters.end.toISOString(),
      bbox: map.getBounds().toArray().flat(),
    }
  }

  function loadLastMonth() {
    filters.start = new Date()
    filters.start.setMonth(filters.start.getMonth() - 1)
    filters.end = new Date()
    load()
  }

  async function load() {
    const params = new URLSearchParams({
      format: "geojson",
      ...flush(serializeFilters()),
    }).toString()

    const response = await fetch(`/api/tracks?${params}`)
    const tracks = (await response.json()) as FeatureCollection<any, any>

    tracks.features = tracks.features.filter(
      (track) => track.geometry.coordinates.length > 1
    )

    minDate = Number.MAX_SAFE_INTEGER
    maxDate = 0

    tracks.features.forEach((track) => {
      track.properties.captureDate = new Date(
        track.properties.captureDate
      ).getTime()
      minDate = Math.min(minDate, track.properties.captureDate)
      maxDate = Math.max(maxDate, track.properties.captureDate)
    })

    if (filters.start.getTime() === 0) {
      filters.start = new Date(minDate)
    }

    data = tracks
  }

  function handleSelectFeature(event: CustomEvent<LayerClickInfo>) {
    console.log(event)

    const feature = event.detail.features[0]
    if (!feature) return

    if (selectedTrack) {
      event.detail.map.setFeatureState(
        { source: "tracks", id: selectedTrack.id },
        { selected: false }
      )
    }

    event.detail.map.setFeatureState(
      { source: "tracks", id: feature.id },
      { selected: true }
    )

    selectedTrack = feature
  }

  onMount(async () => {
    console.log(map)
    await load()

    const boundingBox = bbox(data)
    map.fitBounds(boundingBox as any, { padding: 50, duration: 0 })
  })
</script>

<MapLibre
  bind:map
  style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  class="full-map"
  standardControls
>
  <Control position="top-right">
    <div class="control-group filters">
      <div class="input-group">
        <label for="from-date">From</label>
        <DateFilter id="from-date" bind:value={filters.start} />
      </div>

      <div class="input-group">
        <label for="to-date">To</label>
        <DateFilter id="to-date" bind:value={filters.end} />
      </div>

      <div class="input-group">
        <button on:click={load}>Refresh</button>
      </div>

      <div class="input-group">
        <button on:click={loadLastMonth}>Preset: Last 30 Days</button>
      </div>
    </div>
  </Control>

  {#if data.features.length > 0}
    <GeoJSON id="tracks" {data}>
      <LineLayer
        id="selected"
        layout={{ "line-cap": "round", "line-join": "round" }}
        filter={["boolean", ["feature-state", "selected"], false]}
        paint={{
          "line-width": 5,
          "line-color": "#FF0000",
          "line-opacity": 1,
        }}
      />

      <LineLayer
        manageHoverState
        hoverCursor="pointer"
        layout={{ "line-cap": "round", "line-join": "round" }}
        on:click={handleSelectFeature}
        filter={["!", ["to-boolean", ["feature-state", "selected"]]]}
        paint={{
          "line-width": 5,
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "captureDate"],
            minDate,
            "#004D00",
            maxDate,
            "#00FF00",
          ],
          "line-opacity": 1,
        }}
      >
        <Popup openOn="manual" open={!!selectedTrack} let:data>
          <table class="track-props">
            <tbody>
              <tr>
                <th>Name</th>
                <td>{selectedTrack?.properties?.name}</td>
              </tr>
              <tr>
                <th>Capture Date</th>
                <td
                  >{new Date(
                    selectedTrack?.properties?.captureDate
                  ).toLocaleString()}</td
                >
              </tr>
              <tr>
                <th>File Path</th>
                <td>{selectedTrack?.properties?.filePath}</td>
              </tr>
            </tbody>
          </table>
        </Popup>
      </LineLayer>
    </GeoJSON>
  {/if}
</MapLibre>

<style>
  :global(.full-map) {
    width: 100%;
    height: 100%;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    padding: 0.5em 1em;
    background-color: white;
    border-radius: 0.5em;
    box-shadow: 0 0 1em rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 0.5em;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
  }

  .filters label {
    font-weight: bold;
  }

  .track-props {
    width: 100%;
    border-collapse: collapse;
  }

  .track-props th,
  .track-props td {
    padding: 0.5em;
  }

  .track-props th {
    text-align: left;
  }
</style>
