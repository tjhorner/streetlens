<script lang="ts">
  import { onMount } from "svelte"
  import { Toaster, toast } from "svelte-sonner"

  let eventSource: EventSource | undefined

  type NotificationType = "success" | "error" | "info"

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
      toastFunction(notification.title, {
        description: notification.message,
        position: "top-center",
      })
    })

    return () => {
      eventSource?.close()
    }
  })
</script>

<Toaster richColors closeButton />
