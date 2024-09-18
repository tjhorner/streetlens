<script lang="ts">
  import DateFilter from "./DateFilter.svelte"

  export let filters: { [key: string]: any } = {
    start: 0,
    end: new Date().getTime(),
  }

  function loadLastMonth() {
    const now = new Date()
    filters.start = now.setDate(now.getDate() - 30)
    filters.end = new Date().getTime()
  }
</script>

<div class="input-group">
  <label for="from-date">From</label>
  <DateFilter id="from-date" bind:value={filters.start} />
</div>

<div class="input-group">
  <label for="to-date">To</label>
  <DateFilter id="to-date" bind:value={filters.end} />
</div>

<div class="input-group">
  <button on:click={loadLastMonth}>Preset: Last 30 Days</button>
</div>

<style>
  .input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
  }

  .input-group button {
    background-color: revert !important;
  }

  label {
    font-weight: bold;
  }
</style>
