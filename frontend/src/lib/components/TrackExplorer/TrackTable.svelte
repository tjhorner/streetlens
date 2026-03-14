<script lang="ts">
  import * as Table from "$lib/components/ui/table"
  import type { FeatureCollection, Feature, Geometry } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import { createEventDispatcher } from "svelte"

  export let tracks: FeatureCollection<Geometry, TrackProps>

  const dispatch = createEventDispatcher<{
    select: Feature<Geometry, TrackProps>
    hover: Feature<Geometry, TrackProps>
    unhover: Feature<Geometry, TrackProps>
  }>()
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head>Capture Date</Table.Head>
      <Table.Head>Name</Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each tracks.features as track}
      <Table.Row
        class="cursor-pointer"
        on:mouseenter={() => dispatch("hover", track)}
        on:mouseleave={() => dispatch("unhover", track)}
        on:click={() => dispatch("select", track)}
      >
        <Table.Cell>
          {new Date(track.properties.captureDate).toLocaleString()}
        </Table.Cell>
        <Table.Cell>{track.properties.name}</Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>
