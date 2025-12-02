// Socket.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { NotificationService } from "../notification/notification.service";
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private readonly serverUrl = "https://rent-wyse-backend-g6fke4h3fmbdhzgr.canadacentral-01.azurewebsites.net"; 

  constructor(private notificationService: NotificationService) {
    // Don't connect here
  } 

  public connect(userId: string): void {
    if (!userId) {
      console.error('No user ID provided, cannot connect to WebSocket server');
      return;
    }
    // Now we have a userId, let's connect to the WebSocket server
    this.socket = io(this.serverUrl, {
      auth: {
        userId: userId, // You can send the userId as part of the connection options
      }
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server as User', userId);
      this.socket.emit('registerUser', userId); // Register the user
      this.onNewMessage((data) => {
        // listener logic here
        console.log(data)
        this.notificationService.pushNewMessage(data);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  public onNewMessage(listener: (data: any) => void): void {
    this.socket.on('newMessage', listener);
  }

  public disconnectMessageListener(): void {
    // Remove the listener for new messages
    this.socket.off('newMessage');
    console.log('Disconnected from WebSocket messageListener on logout');

  }

  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('Disconnected from WebSocket server on logout');
    }
  }

  // Add other methods to communicate with the server as needed
}
