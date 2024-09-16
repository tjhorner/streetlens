<script>
  import "../app.css"
  import TrackMap from "$lib/components/TrackMap.svelte"
  import RecentImports from "$lib/components/RecentImports.svelte"
</script>

<div class="split">
  <div class="left"><TrackMap /></div>
  <div class="right"><RecentImports /></div>
</div>

<style>
  .split {
    display: flex;
    height: 100%;
  }

  .left {
    flex: 1;
  }

  .right {
    min-width: 300px;
    overflow-y: scroll;
  }
</style>
