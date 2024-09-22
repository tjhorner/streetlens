<script lang="ts">
  import {
    type DateValue,
    DateFormatter,
    getLocalTimeZone,
  } from "@internationalized/date"
  import { cn } from "$lib/utils.js"
  import { Button } from "$lib/components/ui/button"
  import { Calendar } from "$lib/components/ui/calendar"
  import * as Popover from "$lib/components/ui/popover"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { faCalendar } from "@fortawesome/free-solid-svg-icons"
 
  export let value: DateValue | undefined = undefined

  const df = new DateFormatter("en-US", {
    dateStyle: "long",
  })
</script>
 
<Popover.Root openFocus>
  <Popover.Trigger asChild let:builder>
    <Button
      variant="outline"
      class={cn(
        "w-[280px] justify-start text-left font-normal",
        !value && "text-muted-foreground"
      )}
      builders={[builder]}
    >
      <FontAwesomeIcon class="mr-2 h-4 w-4" icon={faCalendar} />
      {value ? df.format(value.toDate(getLocalTimeZone())) : "Select a date"}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-auto p-0">
    <Calendar bind:value initialFocus />
  </Popover.Content>
</Popover.Root>