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
  import { type DateValue, CalendarDate, getLocalTimeZone, today, fromAbsolute } from "@internationalized/date"
  import * as Card from "$lib/components/ui/card"

  export let tracks: FeatureCollection<LineString, TrackProps>
  export let selectedTrack: Feature<LineString, TrackProps> | null = null

  const map = mapContext().map

  let selectionCircle: Feature<Polygon> | undefined
  let tracksNearSelection: FeatureCollection<LineString, TrackProps> | undefined

  let minDate: number = Number.MAX_SAFE_INTEGER
  let maxDate: number = 0

  let filters: { [key: string]: DateValue } = {
    start: new CalendarDate(0, 0, 0),
    end: today(getLocalTimeZone()),
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

    if (filters.start.year === 1) {
      filters.start = fromAbsolute(minDate, getLocalTimeZone())
    }
  }

  function onLayerClick(e: CustomEvent<LayerClickInfo>) {
    selectionCircle = undefined
    tracksNearSelection = undefined

    const searchRadius =
      $map!.unproject([15, 0]).lng - $map!.unproject([0, 0]).lng

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

  function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
  }

  function endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
  }

  $: tracks && updateDateRange()

  $: layerFilter = [
    "all",
    [">=", ["get", "captureDate"], startOfDay(filters.start.toDate(getLocalTimeZone())).getTime()],
    ["<=", ["get", "captureDate"], endOfDay(filters.end.toDate(getLocalTimeZone())).getTime()],
  ] as any
</script>

<Control position="top-right" class="m-2 pointer-events-auto" defaultStyling={false}>
  <div class="flex flex-col gap-2" transition:fly={{ x: "100%" }}>
    <Card.Root>
      <Card.Content class="p-2">
        <span class="font-bold">Capture Date</span>
        <Legend start={new Date(minDate)} end={new Date(maxDate)} />
      </Card.Content>
    </Card.Root>
  
    <Card.Root>
      <Card.Content class="p-3">
        <TrackFilterControl bind:filters />
      </Card.Content>
    </Card.Root>
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
    id="trackHitbox"
    beforeId="highlightedTracks"
    hoverCursor="pointer"
    on:click={onLayerClick}
    filter={layerFilter}
    layout={{ "line-cap": "round", "line-join": "round" }}
    paint={{
      "line-width": 40,
      "line-opacity": 0,
    }}
  >
    <Popup popupClass="table-popup" openOn="click" let:close>
      {#if tracksNearSelection}
        <TrackTable
          tracks={tracksNearSelection}
          on:hover={(e) => setHoverState(e.detail, true)}
          on:unhover={(e) => setHoverState(e.detail, false)}
          on:select={(e) => {
            selectTrack(e.detail)
            close()
          }}
        />
      {:else}
        {close()}
      {/if}
    </Popup>
  </LineLayer>

  <LineLayer
    id="allTracks"
    beforeId="trackHitbox"
    interactive={false}
    filter={layerFilter}
    layout={{ "line-cap": "round", "line-join": "round" }}
    paint={{
      // make line thinner as we zoom in
      "line-width": ["interpolate", ["linear"], ["zoom"], 0, 8, 18, 2],
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
  />
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
  :global(.table-popup .maplibregl-popup-content) {
    @apply p-3 bg-card max-h-[400px] overflow-y-auto;
  }

  :global(.table-popup .maplibregl-popup-tip) {
    @apply border-t-card border-b-card;
  }
</style>
