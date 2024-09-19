<script lang="ts">
  import { faLocationArrow } from "@fortawesome/free-solid-svg-icons"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { scale } from "svelte/transition"

  export let heading: number
</script>

<div
  transition:scale|global
  class="heading-marker"
  style={`transform: rotate(${heading - 45}deg)`}
>
  <FontAwesomeIcon icon={faLocationArrow} />
</div>

<style>
  .heading-marker {
    pointer-events: none;
    height: 20px;
    width: 20px;
    font-size: 1.8rem;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: sans-serif;
  }
</style>
