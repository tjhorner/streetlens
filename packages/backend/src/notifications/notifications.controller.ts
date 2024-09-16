import { Controller, Sse, MessageEvent } from "@nestjs/common"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { fromEvent, Observable } from "rxjs"

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse()
  sse(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, "notification.send", (data) => ({
      data,
    }))
  }
}
