<script lang="ts">
  import * as Table from "$lib/components/ui/table"
  import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome"
  import { onMount } from "svelte"
  import { Button } from "../ui/button"
  import { Input } from "../ui/input"

  interface NotificationTarget {
    id: number
    appriseUrl: string
  }

  let targets: NotificationTarget[] = []
  let newTargetUrl: string = ""

  async function loadTargets() {
    targets = await getTargets()
  }

  async function createTarget() {
    await fetch("/api/notification-targets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appriseUrl: newTargetUrl }),
    })
    newTargetUrl = ""
    loadTargets()
  }

  async function getTargets() {
    const response = await fetch("/api/notification-targets")
    return await response.json()
  }

  async function deleteTarget(id: number) {
    await fetch(`/api/notification-targets/${id}`, { method: "DELETE" })
    loadTargets()
  }

  onMount(() => {
    loadTargets()
  })
</script>

<Table.Root>
  <Table.Header>
    <Table.Row>
      <Table.Head class="w-full">Apprise URL</Table.Head>
      <Table.Head class="text-right"></Table.Head>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {#each targets as target}
      <Table.Row>
        <Table.Cell class="font-mono">{target.appriseUrl}</Table.Cell>
        <Table.Cell class="text-right">
          <Button on:click={() => deleteTarget(target.id)} variant="destructive" size="sm" title="Delete">
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </Table.Cell>
      </Table.Row>
    {/each}
    <Table.Row class="hover:bg-inherit">
      <Table.Cell>
        <Input
          class="font-mono"
          bind:value={newTargetUrl}
          placeholder="tgram://bottoken/ChatID"
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
