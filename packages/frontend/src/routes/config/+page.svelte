<script lang="ts">
  import ImportDirectoryConfig from "$lib/components/ImportDirectoryConfig/ImportDirectoryConfig.svelte"
  import * as Card from "$lib/components/ui/card"
</script>

<div class="container py-8 flex flex-col gap-4">
  <h1>Configuration</h1>

  <Card.Root>
    <Card.Header>
      <Card.Title>Import Directories</Card.Title>
      <Card.Description>StreetLens will watch these directories for new files to import.</Card.Description>
    </Card.Header>
    <Card.Content>
      <ImportDirectoryConfig />
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Notifications</Card.Title>
      <Card.Description>Get notified of import events on your preferred platform.</Card.Description>
    </Card.Header>
    <Card.Content>
    </Card.Content>
  </Card.Root>
</div>
