<script lang="ts">
  import type { FeatureCollection, Feature, LineString, Polygon } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import {
    GeoJSON,
    LineLayer,
    Popup,
    mapContext,
    FillLayer,
    Control,
  } from "svelte-maplibre"
  import type { LayerClickInfo } from "svelte-maplibre/types.svelte"
  import pointToLineDistance from "@turf/point-to-line-distance"
  import TrackTable from "./TrackTable.svelte"
  import { circle } from "@turf/circle"
  import Legend from "./Legend.svelte"
  import { fly } from "svelte/transition"
  import TrackFilterControl from "./TrackFilterControl.svelte"

  export let tracks: FeatureCollection<LineString, TrackProps>
  export let selectedTrack: Feature<LineString, TrackProps> | null = null

  const map = mapContext().map

  let selectionCircle: Feature<Polygon> | undefined
  let tracksNearSelection: FeatureCollection<LineString, TrackProps> | undefined

  let minDate: number = Number.MAX_SAFE_INTEGER
  let maxDate: number = 0

  let filters: { [key: string]: any } = {
    start: 0,
    end: new Date().getTime(),
  }

  function updateDateRange() {
    minDate = Number.MAX_SAFE_INTEGER
    maxDate = 0

    tracks.features.forEach((track) => {
      minDate = Math.min(minDate, track.properties.captureDate)
      maxDate = Math.max(maxDate, track.properties.captureDate)
    })

    if (minDate === maxDate) {
      minDate -= 1
      maxDate += 1
    }
  }

  function onLayerClick(e: CustomEvent<LayerClickInfo>) {
    const searchRadius =
      $map!.unproject([10, 0]).lng - $map!.unproject([0, 0]).lng

    const clickedPoint = e.detail.event.lngLat
    const nearbyFeatures = tracks.features
      .filter(
        (track) =>
          pointToLineDistance(
            [clickedPoint.lng, clickedPoint.lat],
            track.geometry as LineString,
            { units: "degrees" }
          ) < searchRadius
      )
      .sort((a, b) => {
        return b.properties?.captureDate - a.properties?.captureDate
      })

    if (nearbyFeatures.length === 0) {
      tracksNearSelection = undefined
      return
    }

    if (nearbyFeatures.length === 1) {
      selectedTrack = nearbyFeatures[0]
      return
    }

    selectionCircle = circle(
      [clickedPoint.lng, clickedPoint.lat],
      searchRadius,
      {
        steps: 32,
        units: "degrees",
      }
    )

    tracksNearSelection = {
      type: "FeatureCollection",
      features: nearbyFeatures as any,
    }
  }

  function setHoverState(
    track: Feature<LineString, TrackProps>,
    hovered: boolean
  ) {
    $map?.setFeatureState(
      { source: "allTracks", id: track.id },
      { hover: hovered }
    )
  }

  function selectTrack(track: Feature<LineString, TrackProps>) {
    tracksNearSelection = undefined
    selectionCircle = undefined
    selectedTrack = track
  }

  $: tracks && updateDateRange()
</script>

<Control position="top-right">
  <div class="control-group" transition:fly={{ x: "100%" }}>
    <Legend start={new Date(minDate)} end={new Date(maxDate)} />
  </div>

  <div class="control-group" transition:fly={{ x: "100%" }}>
    <TrackFilterControl bind:filters />
  </div>
</Control>

<GeoJSON id="allTracks" data={tracks}>
  <LineLayer
    id="highlightedTracks"
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

  <LineLayer
    id="allTracks"
    beforeId="highlightedTracks"
    hoverCursor="pointer"
    on:click={onLayerClick}
    filter={[
      "all",
      [">=", ["get", "captureDate"], filters.start],
      ["<=", ["get", "captureDate"], filters.end],
    ]}
    layout={{ "line-cap": "round", "line-join": "round" }}
    paint={{
      "line-width": 4,
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
    <Popup popupClass="table-popup" openOn="click" let:close>
      {#if tracksNearSelection}
        <h3>{tracksNearSelection.features.length} tracks</h3>
        <TrackTable
          tracks={tracksNearSelection}
          on:hover={(e) => setHoverState(e.detail, true)}
          on:unhover={(e) => setHoverState(e.detail, false)}
          on:select={(e) => {
            selectTrack(e.detail)
            close()
          }}
        />
      {/if}
    </Popup>
  </LineLayer>
</GeoJSON>

{#if selectionCircle}
  <GeoJSON id="selectionCircle" data={selectionCircle}>
    <LineLayer
      id="selectionCircleLine"
      interactive={false}
      layout={{ "line-cap": "round", "line-join": "round" }}
      paint={{
        "line-width": 2,
        "line-color": "#FF0000",
        "line-opacity": 1,
      }}
    />

    <FillLayer
      id="selectionCircleFill"
      interactive={false}
      paint={{
        "fill-color": "#FF0000",
        "fill-opacity": 0.5,
      }}
    />
  </GeoJSON>
{/if}

<style>
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

  :global(.table-popup .maplibregl-popup-content) {
    padding: 10px;
    background-color: #333;
    max-height: 400px;
    overflow-y: auto;
  }

  :global(.table-popup h3) {
    margin: 0;
  }

  :global(.table-popup .maplibregl-popup-tip) {
    border-bottom-color: #333 !important;
  }
</style>
