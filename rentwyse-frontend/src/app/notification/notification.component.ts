import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar, MatSnackBarRef, SimpleSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';
import { Router } from '@angular/router';
import { MessageService } from '../messaging/messaging.service';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  private authStatusSub!: Subscription;
  private userId!: string;
  private messageSubscription!: Subscription;
  private notificationQueue: any[] = [];
  private isSnackbarActive = false;


  constructor(
    private authService: AuthService,
    private socketService: SocketService,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService,
    private router: Router,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    // Subscribe to the auth status to know when the user logs in or out this might not be necc anymore cause of the next if(this.authService.getIsAuth())
    this.authStatusSub = this.authService.getAuthStatusListener()
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          this.userId = this.authService.getUserId();
          this.socketService.disconnect();
          //this.socketService.connect(this.userId);
          // this.socketService.onNewMessage((data) => {
          //   this.showNotifications(data);
          // });
        } else {
          this.socketService.disconnect();
        }
      });

    if (this.authService.getIsAuth()) {
      // If the user is already authenticated, establish the socket connection
      this.userId = this.authService.getUserId();
      // this.socketService.connect(this.userId);
      // this.socketService.onNewMessage((data) => {
      //   this.showNotifications([data]);
      // });
    }

    this.messageSubscription = this.notificationService.newMessages$.subscribe(messages => {
      if (messages.length > 0) {
        // Handle the new messages
        this.showNotifications(messages);
        // Clear the messages once they have been shown
        this.notificationService.clearMessages();
      }
    });
  }

  showNotifications(messages: any[]) {
    // Check each message and add it to the queue if it's not already present
    this.messageService.fetchUnreadMessageCount()
    console.log('messages in showNotifiaction count = '+ messages.length)
    messages.forEach((message) => {
      const isAlreadyQueued = this.notificationQueue.some(
        (queuedMessage) => queuedMessage.conversationId === message.conversationId && queuedMessage.message === message.message
      );
  
      if (!isAlreadyQueued) {
        this.notificationQueue.push(message);
      }
    });

  
    // If the snackbar is not currently active, display the next notification
    if (!this.isSnackbarActive) {
      this.displayNextNotification();
    }
  }
  

  displayNextNotification() {
    if (this.notificationQueue.length > 0) {
      this.isSnackbarActive = true;
      const notificationData = this.notificationQueue.shift();
      // console.log(notificationData)
      // Open the snackbar and save the reference to it
      const snackBarRef: MatSnackBarRef<SimpleSnackBar> = this.snackBar.open(
        `${notificationData.senderUsername}: ${notificationData.message}`, 'View', {
          duration: 5000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['custom-snackbar']
        }
      );

      // Subscribing to the action observable for the snackbar
      snackBarRef.onAction().subscribe(() => {
        this.router.navigate(['/messages', notificationData.conversationId]);
      });

      // After the snackbar is dismissed, display the next notification
      snackBarRef.afterDismissed().subscribe(() => {
        this.isSnackbarActive = false;
        if(this.notificationQueue.length > 1){
        this.displayNextNotification();
        }
      });
    }
  }
  

  ngOnDestroy() {
    this.authStatusSub.unsubscribe();
    this.socketService.disconnect();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }
}
