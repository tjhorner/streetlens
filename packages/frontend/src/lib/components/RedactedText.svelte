<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import Button from "./ui/button/button.svelte"
  import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons"

  export let text: string = "REDACTED"

  function toggle() {
    redacted = !redacted
  }

  let redacted = true
  $: renderedText = redacted ? new Array(text.length).join("•") : text
</script>

<span {...$$restProps}>
  <Button size="sm" variant="ghost" on:click={toggle}>
    {#if redacted}
      <FontAwesomeIcon icon={faEye} />
    {:else}
      <FontAwesomeIcon icon={faEyeSlash} />
    {/if}
  </Button>
  {renderedText}
</span>