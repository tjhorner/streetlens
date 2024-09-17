<script lang="ts">
  export let heading: number
</script>

<div class="heading-marker" style={`transform: rotate(${heading}deg)`}>↑</div>

<style>
  .heading-marker {
    pointer-events: none;
    height: 20px;
    width: 20px;
    font-size: 2rem;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: sans-serif;
    /* background: green; */
  }
</style>
