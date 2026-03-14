<script lang="ts">
  import Button from "../ui/button/button.svelte"
  import DateFilter from "./DateFilter.svelte"
  import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"

  export let filters: { [key: string]: any } = {
    start: new CalendarDate(0, 0, 0),
    end: today(getLocalTimeZone()),
  }

  const timeZone = getLocalTimeZone()

  function loadLastDays(days: number) {
    const end = today(timeZone)
    const start = end.subtract({ days })
    filters.start = start
    filters.end = end
  }
</script>

<div class="input-group">
  <label for="from-date">From</label>
  <DateFilter bind:value={filters.start} />
</div>

<div class="input-group">
  <label for="to-date">To</label>
  <DateFilter bind:value={filters.end} />
</div>

<div class="preset-group">
  <div class="preset-buttons">
    <Button size="sm" variant="secondary" on:click={() => loadLastDays(30)}>
      Last 30 days
    </Button>
    <Button size="sm" variant="secondary" on:click={() => loadLastDays(365)}>
      Last 365 days
    </Button>
  </div>
</div>

<style>
  .input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
  }

  label {
    font-weight: bold;
  }

  .preset-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
</style>
