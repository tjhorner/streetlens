<script lang="ts">
  import Button from "../ui/button/button.svelte"
  import DateFilter from "./DateFilter.svelte"
  import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date"

  export let filters: { [key: string]: any } = {
    start: new CalendarDate(0, 0, 0),
    end: today(getLocalTimeZone()),
  }

  function loadLastMonth() {
    const now = new Date()
    filters.start = now.setDate(now.getDate() - 30)
    filters.end = new Date().getTime()
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

<style>
  .input-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
  }

  label {
    font-weight: bold;
  }
</style>
