<script lang="ts">
  import type { FeatureCollection, Feature, LineString } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import { createEventDispatcher } from "svelte"

  export let tracks: FeatureCollection<LineString, TrackProps>

  const dispatch = createEventDispatcher<{
    select: Feature<LineString, TrackProps>
    hover: Feature<LineString, TrackProps>
    unhover: Feature<LineString, TrackProps>
  }>()
</script>

<table>
  <thead>
    <th>Capture Date</th>
    <th>Name</th>
  </thead>
  <tbody>
    {#each tracks.features as track}
      <tr
        on:mouseenter={() => dispatch("hover", track)}
        on:mouseleave={() => dispatch("unhover", track)}
        on:click={() => dispatch("select", track)}
      >
        <td>{new Date(track.properties.captureDate).toLocaleString()}</td>
        <td>{track.properties.name}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.5rem;
    border-bottom: 1px solid #ddd;
  }

  th {
    text-align: left;
  }

  tr {
    cursor: pointer;
  }

  tr:hover {
    background-color: #f9f9f9;
    color: black;
  }

  @media (prefers-color-scheme: dark) {
    th,
    td {
      border-color: #949494;
    }

    th {
      background-color: #333;
      color: white;
    }

    tr:hover {
      background-color: #333;
      color: white;
    }
  }
</style>
