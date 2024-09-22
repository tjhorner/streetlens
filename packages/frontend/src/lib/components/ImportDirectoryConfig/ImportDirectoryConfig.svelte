<script lang="ts">
  import * as Table from "$lib/components/ui/table"
  import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { onMount } from "svelte"
  import { Button } from "../ui/button"
  import { Input } from "../ui/input"

  interface ImportDirectory {
    id: number
    directoryPath: string
  }

  let directories: ImportDirectory[] = []
  let newDirectoryPath: string = ""

  async function loadDirectories() {
    directories = await getDirectories()
  }

  async function createTarget() {
    await fetch("/api/directories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: newDirectoryPath }),
    })
    newDirectoryPath = ""
    loadDirectories()
  }

  async function getDirectories() {
    const response = await fetch("/api/directories")
    return await response.json()
  }

  async function deleteDirectory(id: number) {
    await fetch(`/api/directories/${id}`, { method: "DELETE" })
    loadDirectories()
  }

  onMount(() => {
    loadDirectories()
  })
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head class="w-full">Directory Path</Table.Head>
      <Table.Head class="text-right"></Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each directories as directory}
      <Table.Row>
        <Table.Cell class="font-mono">{directory.directoryPath}</Table.Cell>
        <Table.Cell class="text-right">
          <Button on:click={() => deleteDirectory(directory.id)} variant="destructive" size="sm" title="Delete">
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </Table.Cell>
      </Table.Row>
    {/each}
    <Table.Row class="hover:bg-inherit">
      <Table.Cell>
        <Input
          class="font-mono"
          bind:value={newDirectoryPath}
          placeholder="/mnt/share/my-videos"
        />
      </Table.Cell>
      <Table.Cell class="text-right">
        <Button on:click={() => createTarget()} size="sm" title="Add">
          <FontAwesomeIcon icon={faPlus} />
        </Button>
      </Table.Cell>
    </Table.Row>
  </Table.Body>
</Table.Root>
