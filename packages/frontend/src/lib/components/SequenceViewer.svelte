<script lang="ts">
  import "@egjs/view360/css/loading-spinner.min.css"
  import View360, { EquirectProjection } from "@egjs/svelte-view360"
  import { LoadingSpinner } from "@egjs/view360"
  import { createEventDispatcher } from "svelte"
  import { fly } from "svelte/transition"

  export let imageUrl: string
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

  $: projection = new EquirectProjection({ src: imageUrl })
</script>

<div class="sequence-viewer" transition:fly={{ duration: 500, y: 500 }}>
  <button class="close" on:click={() => dispatch("close")}>&times;</button>

  <div class="controls">
    <button disabled={!hasPrevious} on:click={() => dispatch("previous")}
      >←</button
    >
    <button disabled={!hasNext} on:click={() => dispatch("next")}>→</button>
  </div>

  <View360
    {projection}
    autoResize
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

  .close {
    aspect-ratio: 1 / 1;
    position: fixed;
    top: 0;
    right: 0;
    padding: 0.3rem 0.7rem;
    font-size: 2em;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 0 8px 0 8px;
  }

  .controls {
    font-family: sans-serif;
    position: fixed;
    bottom: 0;
    padding: 1rem;
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
</style>
