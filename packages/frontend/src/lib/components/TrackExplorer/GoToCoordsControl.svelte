<script lang="ts">
  import { mapContext, DefaultMarker } from "svelte-maplibre"
  import type { LngLatLike } from "svelte-maplibre/types.svelte"
  import Input from "../ui/input/input.svelte"

  const map = mapContext().map

  let value: string = ""
  let markerPos: LngLatLike | undefined

  function submit() {
    markerPos = undefined

    const coords = value.split(",").map((coord) => parseFloat(coord))
    if (coords[1] < -85 || coords[1] > 85) {
      coords.reverse()
    }

    if (coords.length !== 2 || coords.some((coord) => isNaN(coord))) {
      return
    }

    markerPos = [coords[0], coords[1]]

    $map?.flyTo({ center: markerPos, zoom: 15 })
    value = ""
  }
</script>

<div class="go-to-coords-control">
  <Input
    type="text"
    class="bg-card"
    placeholder="Jump to coordinates"
    bind:value
    on:keydown={(e) => e.key === "Enter" && submit()}
  />
</div>

{#if markerPos}
  <DefaultMarker lngLat={markerPos} offset={[0, -20]} />
{/if}

