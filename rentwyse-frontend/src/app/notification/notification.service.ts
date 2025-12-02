// notification.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
private newMessagesSource = new BehaviorSubject<any[]>([]);
  newMessages$ = this.newMessagesSource.asObservable();

  constructor() { }

  pushNewMessage(message: any) {
     // Get the current array of messages
    const currentMessages = this.newMessagesSource.getValue();
    // Ensure currentMessages is always an array
    const updatedMessages = Array.isArray(currentMessages) ? [...currentMessages, message] : [message];
    // Emit the updated array of messages
    this.newMessagesSource.next(updatedMessages);
  }

  clearMessages() {
    // Clear the array of messages
    this.newMessagesSource.next([]);
  }
}
