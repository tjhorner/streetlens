<script lang="ts">
  import TrackExplorer from "$lib/components/TrackExplorer/TrackExplorer.svelte"
  import { page } from "$app/stores"
</script>

<TrackExplorer trackId={$page.params.trackId} imageId={$page.params.imageId} />
<slot />
