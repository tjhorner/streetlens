<script lang="ts">
  export let start: Date
  export let end: Date
</script>

<div class="horiz">
  <span>{start.toLocaleDateString()}</span>
  <div class="gradient"></div>
  <span>{end.toLocaleDateString()}</span>
</div>

<style>
  .horiz {
    display: flex;
    align-items: center;
  }

  .horiz .gradient {
    background: linear-gradient(to right, #002500, #00ff00);
    height: 1em;
    width: 7em;
    flex: 1;
    margin: 0 0.5em;
  }
</style>
