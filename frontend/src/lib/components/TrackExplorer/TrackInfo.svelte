<script lang="ts">
  import * as Card from "$lib/components/ui/card"
  import type { Feature, LineString } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"
  import Button from "../ui/button/button.svelte"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faDownload } from "@fortawesome/free-solid-svg-icons"

  export let track: Feature<LineString, TrackProps>

  function downloadGpx() {
    const gpxUrl = `/api/tracks/${track.id}/gpx`
    const a = document.createElement("a")
    a.href = gpxUrl
    a.download = `${track.properties.name}.gpx`
    a.click()
  }

  function downloadVideo() {
    const videoUrl = `/api/tracks/${track.id}/download`
    const a = document.createElement("a")
    a.href = videoUrl
    a.click()
  }
</script>

<Card.Root>
  <Card.Header class="p-3">
    <Card.Title class="text-xl">Track Info</Card.Title>
  </Card.Header>
  <Card.Content class="p-3 pt-0">
    <table>
      <tr>
        <th>Name</th>
        <td>{track.properties.name}</td>
      </tr>
      <tr>
        <th>Capture Date</th>
        <td>{new Date(track.properties.captureDate).toLocaleString()}</td>
      </tr>
      <tr>
        <th>File Path</th>
        <td>{track.properties.filePath}</td>
      </tr>
    </table>
  </Card.Content>
  <Card.Footer class="p-3 pt-0">
    <div class="actions">
      <Button size="sm" on:click={downloadGpx}>
        <FontAwesomeIcon class="mr-1" icon={faDownload} /> GPX
      </Button>
      <Button size="sm" on:click={downloadVideo}>
        <FontAwesomeIcon class="mr-1" icon={faDownload} /> Video
      </Button>
    </div>
  </Card.Footer>
</Card.Root>

<style>
  .actions {
    display: flex;
    gap: 8px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: right;
    padding-right: 10px;
  }

  td {
    word-break: break-all;
  }
</style>
