<script lang="ts">
  import * as Popover from "$lib/components/ui/popover"
  import * as Table from "$lib/components/ui/table"
  import * as Card from "$lib/components/ui/card"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { Button } from "../ui/button"
  import { faPencil, faTrash } from "@fortawesome/free-solid-svg-icons"
  import ImportDirectoryForm from "./ImportDirectoryForm.svelte"
  import { onMount } from "svelte"

  interface ImportDirectory {
    id: number
    directoryPath: string
  }

  let directories: ImportDirectory[] = []

  async function loadDirectories() {
    directories = await getDirectories()
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
      <Table.Head class="w-[100px]">ID</Table.Head>
      <Table.Head>Directory Path</Table.Head>
      <Table.Head class="text-right"></Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each directories as directory}
      <Table.Row>
        <Table.Cell>{directory.id}</Table.Cell>
        <Table.Cell class="font-mono">{directory.directoryPath}</Table.Cell>
        <Table.Cell class="text-right">
          <Button on:click={() => deleteDirectory(directory.id)} variant="destructive" size="sm" title="Delete">
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </Table.Cell>
      </Table.Row>
    {/each}
  </Table.Body>
</Table.Root>

<Card.Root class="my-3">
  <Card.Header>
    <Card.Title>Add import directory</Card.Title>
  </Card.Header>
  <Card.Content>
    <ImportDirectoryForm on:save={loadDirectories} />
  </Card.Content>
</Card.Root>