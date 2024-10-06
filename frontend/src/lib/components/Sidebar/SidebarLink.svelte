<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import Button from "../ui/button/button.svelte"
  import type { IconDefinition } from "@fortawesome/fontawesome-svg-core"
  import { page } from "$app/stores"

  export let title: string
  export let href: string
  export let icon: IconDefinition

  $: isCurrentPage = $page.url.pathname === href
</script>

<Tooltip.Root openDelay={0}>
  <Tooltip.Trigger class="h-fit">
    <Button {href} variant="ghost" class={`px-2.5 ${isCurrentPage ? "bg-accent text-accent-foreground" : ""}`}>
      <FontAwesomeIcon {icon} />
    </Button>
  </Tooltip.Trigger>
  <Tooltip.Content side="right">
    {title}
  </Tooltip.Content>
</Tooltip.Root>
