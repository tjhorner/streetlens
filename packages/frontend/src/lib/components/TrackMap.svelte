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
  import Legend from "./Legend.svelte"

  let selectedTracks: FeatureCollection | undefined
  let popupOpen = false

  let minDate: number = Number.MAX_SAFE_INTEGER
  let maxDate: number = 0

  let map: maplibregl.Map
  let allTracks: FeatureCollection = {
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
    selectedTracks = undefined

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

    allTracks = tracks
  }

  function handleSelectFeature(event: CustomEvent<LayerClickInfo>) {
    const features = event.detail.features
    if (features.length === 0) {
      selectedTracks = undefined
      return
    }

    const sourceFeatures = features
      .map(
        (feature) =>
          allTracks.features.find((track) => track.id === feature.id)!
      )
      .sort((a, b) => {
        return b.properties?.captureDate - a.properties?.captureDate
      })

    selectedTracks = {
      type: "FeatureCollection",
      features: sourceFeatures as any,
    }
  }

  function getGpxStudioUrl(id: any) {
    const files = JSON.stringify([
      `${window.location.origin}/api/tracks/${id}/gpx`,
    ])
    return `https://gpx.studio/app?files=${encodeURIComponent(files)}`
  }

  function setSelectedFeatureHover(id: any, state = false) {
    map.setFeatureState({ source: "selected", id }, { hover: state })
  }

  onMount(async () => {
    await load()
    const boundingBox = bbox(allTracks)
    map.fitBounds(boundingBox as any, { padding: 50, duration: 0 })
  })
</script>

<MapLibre
  bind:map
  style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
  class="full-map"
  standardControls
>
  <Control position="top-right">
    <div class="control-group">
      <Legend start={new Date(minDate)} end={new Date(maxDate)} />
    </div>

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

  {#if selectedTracks && popupOpen}
    <GeoJSON id="selected" data={selectedTracks}>
      <LineLayer
        id="selected"
        interactive={false}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-width": 5,
          "line-color": "#FF0000",
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            1,
            0,
          ],
        }}
      />
    </GeoJSON>
  {/if}

  {#if allTracks.features.length > 0}
    <GeoJSON id="tracks" data={allTracks}>
      <LineLayer
        id="all"
        manageHoverState
        hoverCursor="pointer"
        layout={{ "line-cap": "round", "line-join": "round" }}
        on:click={handleSelectFeature}
        paint={{
          "line-width": 3,
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "captureDate"],
            minDate,
            "#002500",
            maxDate,
            "#00FF00",
          ],
          "line-opacity": 1,
        }}
      >
        <Popup openOn="click" bind:open={popupOpen}>
          {#if selectedTracks}
            <table class="track-props">
              <thead>
                <tr>
                  <th>Capture Date</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {#each selectedTracks.features as track}
                  <tr
                    on:mouseenter={() =>
                      setSelectedFeatureHover(track.id, true)}
                    on:mouseleave={() =>
                      setSelectedFeatureHover(track.id, false)}
                  >
                    <td
                      >{new Date(
                        track.properties?.captureDate
                      ).toLocaleString()}</td
                    >
                    <td title={track.properties?.filePath}
                      >{track.properties?.name}</td
                    >
                    <td>
                      <button
                        on:click={() =>
                          navigator.clipboard.writeText(
                            track.properties?.filePath
                          )}
                      >
                        Copy Path
                      </button>

                      <a href={getGpxStudioUrl(track.id)} target="_blank"
                        >gpx.studio</a
                      >
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/if}
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
    padding: 0.5em 0.75em;
    background-color: white;
    border-radius: 0.5em;
    box-shadow: 0 0 1em rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 0.5em;
  }

  @media (prefers-color-scheme: dark) {
    .control-group {
      background-color: #333;
      color: white;
    }
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
    color: black;
  }

  .track-props th,
  .track-props td {
    padding: 0.5em;
    border: 1px solid #ccc;
  }

  .track-props th {
    background-color: #f2f2f2;
    font-weight: bold;
    text-align: left;
  }

  .track-props td {
    text-align: left;
  }
</style>
