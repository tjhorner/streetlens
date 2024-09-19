<script lang="ts">
  import type { Feature, LineString } from "geojson"
  import type { TrackProps } from "./TrackExplorer.svelte"

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

<div class="track-info">
  <h2>Track Info</h2>

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

  <div class="actions">
    <button on:click={downloadGpx}>Download GPX</button>
    <button on:click={downloadVideo}>Download Video</button>
  </div>
</div>

<style>
  .track-info {
    padding: 6px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  h2 {
    margin: 0;
    margin-bottom: 6px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
  }

  th {
    text-align: right;
    padding-right: 10px;
  }

  button {
    background-color: revert !important;
  }
</style>
