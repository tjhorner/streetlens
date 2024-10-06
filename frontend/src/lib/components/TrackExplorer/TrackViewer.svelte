<script lang="ts">
  import type { FeatureCollection, Feature, LineString, Point } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import {
    CircleLayer,
    Control,
    GeoJSON,
    LineLayer,
    Marker,
    mapContext,
    type LayerClickInfo,
  } from "svelte-maplibre"
  import bbox from "@turf/bbox"
  import HeadingMarker from "./HeadingMarker.svelte"
  import SequenceViewer from "./SequenceViewer.svelte"
  import { tick } from "svelte"
  import TrackInfo from "./TrackInfo.svelte"
  import { fly } from "svelte/transition"

  interface TrackImageProps {
    sequenceNumber: number
    captureDate: string
    heading: string
  }

  export let track: Feature<LineString, TrackProps>
  export let trackImages: FeatureCollection<Point, TrackImageProps> = {
    type: "FeatureCollection",
    features: [],
  }

  const map = mapContext().map

  let sequenceViewerElement: HTMLElement | undefined
  let selectedImage: Feature<Point, TrackImageProps> | undefined
  let hasPreviousImage = false
  let hasNextImage = false
  let cameraYaw = 0

  async function loadImages() {
    const response = await fetch(
      `/api/tracks/${track.id}/images?format=geojson`
    )
    trackImages = await response.json()
  }

  function onSelectImage(event: CustomEvent<LayerClickInfo>) {
    const features = event.detail.features
    if (features.length === 0) {
      selectedImage = undefined
      return
    }

    selectImage(features[0].id as number)
  }

  async function selectImage(id?: number) {
    if (selectedImage) {
      $map?.setFeatureState(
        { source: "trackImages", id: selectedImage.id },
        { selected: false }
      )
    }

    if (!id) {
      selectedImage = undefined
      fixPadding() // ughhhhh
      flyToTrack()
      return
    }

    const index = trackImages.features.findIndex((image) => image.id === id)
    selectedImage = trackImages.features[index]
    $map?.setFeatureState({ source: "trackImages", id }, { selected: true })

    hasNextImage = index < trackImages.features.length - 1
    hasPreviousImage = index > 0

    await tick()

    $map?.easeTo({
      center: selectedImage.geometry.coordinates as [number, number],
      zoom: 16,
      duration: 500,
      padding: {
        bottom: sequenceViewerElement?.clientHeight ?? 0,
      },
    })
  }

  function flyToTrack() {
    const boundingBox = bbox(track)
    $map?.fitBounds(boundingBox as any, {
      padding: 100,
      duration: 500,
    })
  }

  function moveToImage(relativeIndex: number) {
    if (!selectedImage) {
      return
    }

    const index = trackImages.features.findIndex(
      (image) => image.id === selectedImage!.id
    )
    const newIndex = index + relativeIndex
    if (newIndex < 0 || newIndex >= trackImages.features.length) {
      return
    }

    selectImage(trackImages.features[newIndex].id as number)
  }

  function fixPadding() {
    $map?.setPadding({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })
  }

  $: track && loadImages()

  $: heading = parseFloat(selectedImage?.properties?.heading ?? "0") - cameraYaw
  $: selectedImageCoordinates = (selectedImage?.geometry as Point)
    ?.coordinates as [number, number]
</script>

{#if selectedImage}
  <Control class="image-control" position="bottom-left">
    <SequenceViewer
      bind:el={sequenceViewerElement}
      imageUrl={`/api/images/${selectedImage.id}.jpg`}
      captureDate={new Date(selectedImage.properties.captureDate)}
      hasNext={hasNextImage}
      hasPrevious={hasPreviousImage}
      on:next={() => moveToImage(1)}
      on:previous={() => moveToImage(-1)}
      on:close={() => selectImage(undefined)}
      on:yawChange={({ detail }) => (cameraYaw = detail)}
    />
  </Control>
{/if}

<Control class="track-info-control" position="bottom-right" defaultStyling={false}>
  <div transition:fly={{ x: "100%" }}>
    <TrackInfo {track} />
  </div>
</Control>

<GeoJSON id="selectedTrack" data={track}>
  <LineLayer
    id="selectedTrack"
    layout={{ "line-cap": "round", "line-join": "round" }}
    paint={{
      "line-width": 3,
      "line-color": "#00FF00",
      "line-opacity": 1,
    }}
  >
    {#if selectedImage}
      <Marker lngLat={selectedImageCoordinates} interactive={false}>
        <HeadingMarker {heading} />
      </Marker>
    {/if}
  </LineLayer>
</GeoJSON>

<GeoJSON id="trackImages" data={trackImages}>
  <CircleLayer
    id="images"
    minzoom={12}
    manageHoverState
    hoverCursor="pointer"
    on:click={onSelectImage}
    paint={{
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 2, 18, 10],
      "circle-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#008000",
        "#FF0000",
      ],
      "circle-opacity": [
        "case",
        [
          "any",
          ["boolean", ["feature-state", "selected"], false],
          ["boolean", ["feature-state", "hover"], false],
        ],
        1,
        0.5,
      ],
    }}
  />
</GeoJSON>

<style>
  :global(.track-info-control) {
    @apply m-2 pointer-events-auto flex flex-col gap-2;
  }

  @media (max-width: 600px) {
    :global(.maplibregl-ctrl-bottom-right) {
      z-index: 1;
    }
  }
</style>
