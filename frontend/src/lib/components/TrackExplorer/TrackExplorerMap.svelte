<script lang="ts">
  import type { FeatureCollection, Feature, Geometry } from "geojson"
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
  import { createEventDispatcher } from "svelte"

  export let tracks: FeatureCollection<Geometry, TrackProps>
  export let selectedTrack: Feature<Geometry, TrackProps> | null = null
  export let imageId: string | undefined = undefined

  const dispatch = createEventDispatcher<{
    selectTrack: Feature<Geometry, TrackProps> | null
    selectImage: number | string | undefined
  }>()

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
    <TrackSelector {tracks} on:select={({ detail }) => dispatch("selectTrack", detail)} />
  {:else if selectedTrack !== null}
    <Control position="top-left">
      <div transition:fly={{ x: "-100%" }}>
        <ControlGroup>
          <ControlButton class="text-black" title="Back to Tracks" on:click={() => dispatch("selectTrack", null)}>
            <FontAwesomeIcon icon={faArrowLeft} />
          </ControlButton>
        </ControlGroup>
      </div>
    </Control>

    <TrackViewer track={selectedTrack} {imageId} on:selectImage />
  {/if}

  <slot />
</MapLibre>

<svelte:window
  on:keydown={(e) => e.key === "Escape" && dispatch("selectTrack", null)}
/>

<style>
  :global(.full-map, .full-map canvas) {
    height: 100%;
    outline: none;
  }
</style>
