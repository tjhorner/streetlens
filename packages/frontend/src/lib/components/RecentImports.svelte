<script lang="ts">
  let imports: Promise<Import[]> = loadImports()

  interface Import {
    id: string
    name: string
    finishedAt: string
  }

  async function loadImports() {
    const response = await fetch("/api/tracks/imports?state=completed&limit=25")
    return (await response.json()) as Import[]
  }
</script>

<div class="container">
  <h3>Recently Imported</h3>

  {#await imports}
    <p>Loading...</p>
  {:then imports}
    {#if imports.length === 0}
      <p>No imports found.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Finished At</th>
          </tr>
        </thead>
        <tbody>
          {#each imports as trackImport}
            <tr>
              <td>{trackImport.name}</td>
              <td>{new Date(trackImport.finishedAt).toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/await}
</div>

<style>
  .container {
    padding: 1rem;
  }

  h3 {
    margin-top: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }

  th {
    background-color: #f2f2f2;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #f5f5f5;
  }
</style>
