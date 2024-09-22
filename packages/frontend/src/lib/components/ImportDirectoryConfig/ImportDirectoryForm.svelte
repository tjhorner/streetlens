<script lang="ts">
  import { Label } from "$lib/components/ui/label"
  import { Input } from "$lib/components/ui/input"
  import { Button } from "$lib/components/ui/button"
  import { createEventDispatcher } from "svelte"

  export let existingId: number | undefined = undefined
  export let directoryPath: string = ""

  let saving = false

  const dispatch = createEventDispatcher<{
    save: void
  }>()

  async function saveOrCreate() {
    saving = true

    const body = JSON.stringify({ path: directoryPath })
    const response = await fetch(`/api/directories${existingId ? `/${existingId}` : ""}`, {
      method: existingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    })

    saving = false
    dispatch("save")

    if (!existingId) {
      directoryPath = ""
    }
  }
</script>

<div class="grid w-full items-center gap-1.5 mb-4">
  <Label for="directoryPath">Directory Path</Label>
  <Input type="text" id="directoryPath" placeholder="/mnt/share/my-videos" bind:value={directoryPath} />
</div>

<Button on:click={saveOrCreate} disabled={saving}>{existingId ? "Save" : "Create"}</Button>
