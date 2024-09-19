<script lang="ts">
  import "@egjs/view360/css/loading-spinner.min.css"
  import View360, { EquirectProjection } from "@egjs/svelte-view360"
  import { LoadingSpinner } from "@egjs/view360"
  import { createEventDispatcher } from "svelte"
  import { fly } from "svelte/transition"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import {
    faArrowLeft,
    faArrowRight,
    faXmark,
    faDownload,
  } from "@fortawesome/free-solid-svg-icons"

  export let imageUrl: string
  export let captureDate: Date
  export let hasPrevious: boolean = true
  export let hasNext: boolean = true

  const dispatch = createEventDispatcher<{
    yawChange: number
    previous: void
    next: void
    close: void
  }>()

  function handleViewChange(event: any) {
    dispatch("yawChange", event.detail.yaw)
  }

  function downloadImage() {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = new URL(imageUrl, window.location.origin).pathname
      .split("/")
      .pop()!
    link.click()
  }

  $: projection = new EquirectProjection({ src: imageUrl })
</script>

<div class="sequence-viewer" transition:fly={{ duration: 500, y: 500 }}>
  <button
    title="Close Image Viewer"
    class="close"
    on:click={() => dispatch("close")}
  >
    <FontAwesomeIcon icon={faXmark} />
  </button>

  <div class="controls">
    <button
      title="Previous Image"
      disabled={!hasPrevious}
      on:click={() => dispatch("previous")}
    >
      <FontAwesomeIcon icon={faArrowLeft} />
    </button>
    <button title="Download Image" on:click={downloadImage}>
      <FontAwesomeIcon icon={faDownload} />
    </button>
    <button
      title="Next Image"
      disabled={!hasNext}
      on:click={() => dispatch("next")}
    >
      <FontAwesomeIcon icon={faArrowRight} />
    </button>
  </div>

  <div class="date">
    {captureDate.toLocaleString()}
  </div>

  <View360
    {projection}
    autoResize
    scrollable={false}
    plugins={[new LoadingSpinner()]}
    on:viewChange={handleViewChange}
  />
</div>

<style>
  .sequence-viewer {
    height: 100%;
    display: flex;
    justify-content: center;
  }

  .sequence-viewer :global(canvas) {
    height: 400px;
    width: 600px;
    border-radius: 8px;
  }

  @media (max-width: 600px) {
    .sequence-viewer :global(canvas) {
      width: 100%;
      height: 300px;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    .date {
      border-bottom-right-radius: 0 !important;
    }
  }

  .close {
    position: fixed;
    top: 0;
    right: 0;
    padding: 0.4rem 0.7rem;
    padding-top: 0.5rem;
    font-size: 1.8em;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 0 8px 0 8px;
  }

  .date {
    position: fixed;
    bottom: 0;
    right: 0;
    padding: 0.25rem 0.5rem;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 8px 0 8px 0;
  }

  .controls {
    font-family: sans-serif;
    position: fixed;
    bottom: 0;
    padding: 0.75rem;
    display: flex;
    gap: 10px;
  }

  button {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background-color: rgba(0, 0, 0, 0.2);
    cursor: not-allowed;
  }

  button:not(:disabled):hover {
    background-color: rgba(0, 0, 0, 0.7);
  }

  .sequence-viewer :global(.view360-container) {
    display: flex;
  }
</style>
