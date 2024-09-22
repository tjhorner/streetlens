<script lang="ts">
  import type { FeatureCollection, Feature, LineString } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import {
    MapLibre,
    Control,
    ControlButton,
    ControlGroup,
  } from "svelte-maplibre"
  import TrackSelector from "./TrackSelector.svelte"
  import bbox from "@turf/bbox"
  import TrackViewer from "./TrackViewer.svelte"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"
  import { fly } from "svelte/transition"
  import GoToCoordsControl from "./GoToCoordsControl.svelte"
  import { mode } from "mode-watcher"

  export let tracks: FeatureCollection<LineString, TrackProps>
  export let selectedTrack: Feature<LineString, TrackProps> | null = null

  let map: maplibregl.Map
  let initialZoom = true

  function fitToTrackBounds() {
    if (tracks.features.length === 0 && selectedTrack === null) {
      return
    }

    map.setPadding({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })

    const boundingBox = bbox(selectedTrack ?? tracks)
    map.fitBounds(boundingBox as any, {
      padding: 100,
      duration: initialZoom ? 0 : 1000,
    })

    initialZoom = false
  }

  $: map && (tracks || selectedTrack) && fitToTrackBounds()
  $: mapStyle = $mode === "light" ? "positron" : "dark-matter"
</script>

<MapLibre
  bind:map
  style={`https://basemaps.cartocdn.com/gl/${mapStyle}-gl-style/style.json`}
  class="full-map"
  attributionControl={false}
>
  <Control position="top-left">
    <GoToCoordsControl />
  </Control>

  {#if selectedTrack === null && tracks.features.length > 0}
    <TrackSelector {tracks} bind:selectedTrack />
  {:else if selectedTrack !== null}
    <Control position="top-left">
      <div transition:fly={{ x: "-100%" }}>
        <ControlGroup>
          <ControlButton class="text-black" on:click={() => (selectedTrack = null)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </ControlButton>
        </ControlGroup>
      </div>
    </Control>

    <TrackViewer track={selectedTrack} />
  {/if}

  <slot />
</MapLibre>

<svelte:window
  on:keydown={(e) => e.key === "Escape" && (selectedTrack = null)}
/>

<style>
  :global(.full-map, .full-map canvas) {
    height: 100%;
    outline: none;
  }
</style>
