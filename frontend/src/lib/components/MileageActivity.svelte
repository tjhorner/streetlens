<script lang="ts">
  import * as Card from "$lib/components/ui/card"
  import { tick } from "svelte"

  export let activity: { date: string; distanceMeters: number }[]

  const now = new Date()
  const currentYear = now.getFullYear()
  const today = Date.UTC(currentYear, now.getMonth(), now.getDate())
  let year = currentYear
  let tooltip: HTMLDivElement
  let tooltipText = ""
  let tooltipDay = ""
  let tooltipVisible = false
  let tooltipX = 0
  let tooltipY = 0
  let tooltipBelow = false
  let tooltipRequest = 0

  async function showTooltip(event: Event, day: { date: Date; label: string }) {
    const anchor = event.currentTarget as HTMLElement
    const request = ++tooltipRequest
    tooltipText = day.label
    tooltipDay = key(day.date)
    await tick()
    if (request !== tooltipRequest) return
    const rect = anchor.getBoundingClientRect()
    const width = tooltip.offsetWidth
    tooltipX = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
    tooltipBelow = rect.top < tooltip.offsetHeight + 16
    tooltipY = tooltipBelow ? rect.bottom + 8 : rect.top - 8
    tooltipVisible = true
  }

  function hideTooltip() {
    tooltipRequest++
    tooltipVisible = false
    tooltipDay = ""
  }
  const miles = (meters: number) => (meters / 1609.344).toLocaleString(undefined, { maximumFractionDigits: 1 })
  const key = (date: Date) => date.toISOString().slice(0, 10)

  $: years = [...new Set([currentYear, ...activity.map((day) => Number(day.date.slice(0, 4)))])].sort((a, b) => b - a)
  $: distances = new Map(activity.map((day) => [day.date, day.distanceMeters]))
  $: days = makeDays(year, distances)
  $: maximum = Math.max(0, ...days.map((day) => day?.meters ?? 0))
  $: activeDays = days.filter((day) => day && day.meters > 0).length
  $: total = days.reduce((sum, day) => sum + (day?.meters ?? 0), 0)
  $: months = days.flatMap((day, index) => day?.date.getUTCDate() === 1
    ? [{ label: day.date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" }), column: Math.floor(index / 7) + 1 }] : [])

  function makeDays(selectedYear: number, values: Map<string, number>) {
    const first = new Date(Date.UTC(selectedYear, 0, 1))
    const last = new Date(Date.UTC(selectedYear, 11, 31))
    const cells: ({ date: Date; meters: number; label: string; future: boolean } | null)[] = Array(first.getUTCDay()).fill(null)
    for (let time = first.getTime(); time <= last.getTime(); time += 86_400_000) {
      const date = new Date(time)
      const meters = values.get(key(date)) ?? 0
      const future = time > today
      cells.push({ date, meters, future, label: `${date.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })}: ${future ? "Future date" : `${miles(meters)} miles`}` })
    }
    while (cells.length % 7) cells.push(null)
    return cells
  }

</script>

<svelte:window on:scroll|capture={hideTooltip} on:resize={hideTooltip} on:keydown={(event) => { if (event.key === "Escape") hideTooltip() }} />

<div
  bind:this={tooltip}
  id="mileage-day-tooltip"
  role="tooltip"
  aria-hidden={!tooltipVisible}
  class="pointer-events-none fixed z-50 w-max max-w-[calc(100vw-16px)] rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
  style:left={`${tooltipX}px`}
  style:top={`${tooltipY}px`}
  style:transform={tooltipBelow ? "none" : "translateY(-100%)"}
  style:opacity={tooltipVisible ? 1 : 0}
  style:transition="opacity 60ms ease-out"
>{tooltipText}</div>

<Card.Root>
  <Card.Header>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <Card.Title>Mileage activity</Card.Title>
      <div class="flex items-center gap-2">
        <label for="activity-year" class="text-sm text-muted-foreground">Year</label>
        <select id="activity-year" bind:value={year} on:change={hideTooltip} class="rounded-md border bg-background px-3 py-2 text-sm">
          {#each years as option}<option value={option}>{option}</option>{/each}
        </select>
      </div>
    </div>
    <Card.Description>{miles(total)} miles across {activeDays.toLocaleString()} active days in {year}</Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="activity-colors">
    <div class="overflow-x-auto pb-2">
      <div class="w-full min-w-[640px]">
        <div class="ml-9 mb-2 grid gap-[3px] text-xs text-muted-foreground" style:grid-template-columns={`repeat(${days.length / 7}, minmax(0, 1fr))`}>
          {#each months as month}
            <span style:grid-column={month.column}>{month.label}</span>
          {/each}
        </div>
        <div class="flex gap-2">
          <div class="grid w-7 shrink-0 grid-rows-7 items-center gap-[3px] text-[10px] leading-3 text-muted-foreground" aria-hidden="true">
            <span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span>
          </div>
          <div class="grid min-w-0 flex-1 grid-flow-col grid-rows-7 gap-[3px]" style:grid-template-columns={`repeat(${days.length / 7}, minmax(0, 1fr))`}>
            {#each days as day}
              {#if day}
                {#if day.future}
                  <span
                    class="aspect-square w-full rounded-sm border border-dashed border-muted-foreground/40"
                    aria-label={day.label}
                    role="img"
                  ></span>
                {:else}
                <button
                    type="button"
                    class="aspect-square w-full rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ring-inset ring-1 ring-black/5 dark:ring-white/10"
                    style={day.meters > 0
                      ? `background: color-mix(in oklab, var(--activity-low), var(--activity-high) ${day.meters / maximum * 100}%)`
                      : "background: hsl(var(--muted))"}
                    aria-label={day.label}
                    aria-describedby={tooltipVisible && tooltipDay === key(day.date) ? "mileage-day-tooltip" : undefined}
                    on:mouseenter={(event) => showTooltip(event, day)}
                    on:mouseleave={hideTooltip}
                    on:focus={(event) => showTooltip(event, day)}
                    on:blur={hideTooltip}
                    on:click={(event) => showTooltip(event, day)}
                ></button>
                {/if}
              {:else}
                <span class="aspect-square w-full" aria-hidden="true"></span>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 flex justify-end text-xs text-muted-foreground">
      <div class="flex items-center gap-1" aria-label="More intense green means more miles, scaled to the busiest day in the selected year">
        <span class="mr-1">Less</span>
        <span class="h-3 w-3 rounded-sm bg-muted" title="No miles"></span>
        <span class="activity-gradient h-3 w-24 rounded-sm" aria-hidden="true"></span>
        <span class="ml-1">More</span>
      </div>
    </div>
    </div>
  </Card.Content>
</Card.Root>

<style>
  .activity-colors {
    --activity-low: #dcfce7;
    --activity-high: #166534;
  }

  :global(.dark) .activity-colors {
    --activity-low: #123520;
    --activity-high: #4ade80;
  }

  .activity-gradient {
    background: linear-gradient(to right in oklab, var(--activity-low), var(--activity-high));
  }
</style>
