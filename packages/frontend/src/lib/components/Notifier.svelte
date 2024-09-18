<script lang="ts">
  import { onMount } from "svelte"
  import toast, { Toaster } from "svelte-french-toast"

  let eventSource: EventSource | undefined

  type NotificationType = "success" | "error"

  interface NotificationSendEvent {
    title: string
    message: string
    type?: NotificationType
  }

  onMount(() => {
    eventSource = new EventSource("/api/notifications")

    eventSource.addEventListener("message", (event) => {
      const notification: NotificationSendEvent = JSON.parse(event.data)

      const toastFunction = notification.type ? toast[notification.type] : toast
      toastFunction(`${notification.title} - ${notification.message}`, {
        position: "top-left",
      })
    })

    return () => {
      eventSource?.close()
    }
  })
</script>

<Toaster />
