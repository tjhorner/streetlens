<script>
  import "../app.css"
  import "@fortawesome/fontawesome-svg-core/styles.css"
  import { config } from "@fortawesome/fontawesome-svg-core"
  import Sidebar from "$lib/components/Sidebar/Sidebar.svelte"
  import { ModeWatcher } from "mode-watcher"
  import Notifier from "$lib/components/Notifier.svelte"

  config.autoAddCss = false
</script>

<Notifier />
<ModeWatcher />

<svelte:head>
  <title>StreetLens</title>
</svelte:head>

<div class="flex h-full">
  <Sidebar />
  <main class="flex-grow">
    <slot />
  </main>
</div>