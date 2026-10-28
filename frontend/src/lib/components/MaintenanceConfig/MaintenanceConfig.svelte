<script lang="ts">
  import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { onMount } from "svelte"
  import { Button } from "../ui/button"

  interface ProcessorVersionStatus {
    currentVersion: number
    outdatedTracks: number
    outdatedImages: number
  }

  interface ReprocessResult {
    tracksQueued: number
    imageOnlyTracksQueued: number
  }

  let status: ProcessorVersionStatus | undefined
  let queued: ReprocessResult | undefined
  let queueing = false

  $: hasOutdated = !!status && (status.outdatedTracks > 0 || status.outdatedImages > 0)

  async function loadStatus() {
    const response = await fetch("/api/tracks/processor-versions")
    status = await response.json()
  }

  async function reprocessOutdated() {
    queueing = true
    try {
      const response = await fetch("/api/tracks/reprocess-outdated", { method: "POST" })
      queued = await response.json()
    } finally {
      queueing = false
    }
  }

  function plural(count: number, noun: string) {
    return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`
  }

  onMount(() => {
    loadStatus()
  })
</script>

{#if status}
  <div class="flex flex-col gap-4">
    <p>
      {#if hasOutdated}
        {plural(status.outdatedTracks, "track")} and {plural(status.outdatedImages, "image")}
        were processed with an older version than the current one (version {status.currentVersion}).
      {:else}
        All tracks and images are up to date (version {status.currentVersion}).
      {/if}
    </p>

    {#if hasOutdated}
      <p class="text-sm text-muted-foreground">
        Tracks are reprocessed in place. Their images are deleted and extracted again, and files left over from the old version are removed.
      </p>

      <div class="flex items-center gap-4">
        <Button on:click={reprocessOutdated} disabled={queueing || !!queued}>
          <FontAwesomeIcon icon={faArrowsRotate} class="mr-2" />
          Reprocess outdated tracks and images
        </Button>

        {#if queued}
          <span class="text-sm">
            Queued {plural(queued.tracksQueued + queued.imageOnlyTracksQueued, "track")}.
            Follow progress on the <a href="/queues">Queues</a> page.
          </span>
        {/if}
      </div>
    {/if}
  </div>
{/if}
