<script>
  import { faMap, faCog, faBarsProgress } from "@fortawesome/free-solid-svg-icons"
  import SidebarLink from "./SidebarLink.svelte"
</script>

<nav class="flex flex-col gap-3 justify-start p-3">
  <SidebarLink
    title="Map"
    icon={faMap}
    href="/"
  />

  <SidebarLink
    title="Queues"
    icon={faBarsProgress}
    href="/queues"
  />

  <SidebarLink
    title="Configuration"
    icon={faCog}
    href="/config"
  />
</nav>