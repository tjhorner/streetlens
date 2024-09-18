<script lang="ts">
  import { onMount } from "svelte"

  export let value: number = 0

  let inputElement: HTMLInputElement

  function toLocalISOString(date: any) {
    const localDate = new Date(date - date.getTimezoneOffset() * 60000)

    localDate.setSeconds(null as any)
    localDate.setMilliseconds(null as any)
    return localDate.toISOString().slice(0, -1)
  }

  function updateSelectedDate(newValue: string) {
    if (newValue === "") return
    value = new Date(newValue).getTime()
  }

  $: inputElement && (inputElement.value = toLocalISOString(new Date(value)))

  onMount(() => {
    const initialValue = toLocalISOString(new Date(value))
    inputElement.value = initialValue
  })
</script>

<input
  {...$$restProps}
  bind:this={inputElement}
  type="datetime-local"
  on:change={(e) => updateSelectedDate(e.currentTarget.value)}
/>
