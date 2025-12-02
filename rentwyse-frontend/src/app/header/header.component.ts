
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { Subscription } from 'rxjs';
import { MessageService } from '../messaging/messaging.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
  })
  export class HeaderComponent implements OnInit, OnDestroy {
    private authListenerSubs!: Subscription ;
    unreadMessageCount: number = 0;
    userIsAuth = false;

    constructor(private authService: AuthService,private messageService: MessageService){

    }

    toggleNav() {
        const navList = document.querySelector('.nav-list');
        if (navList) {
            navList.classList.toggle('active');
        }
    }
    

    ngOnInit() {
      this.userIsAuth = this.authService.getIsAuth();
    
      // Subscribe to unread message count updates
      this.messageService.getUnreadMessageCount().subscribe(count => {
        this.unreadMessageCount = count;
        console.log("unreadMessageCount:", count);
      });
    
      // Subscribe to authentication status updates
      this.authListenerSubs = this.authService.getAuthStatusListener().subscribe(isAuthenticated => {
        this.userIsAuth = isAuthenticated;
        if (isAuthenticated) {
          // Fetch the latest unread message count
          this.messageService.fetchUnreadMessageCount();
        }
      });
    
      // Initial fetch of unread message count if authenticated
      if (this.userIsAuth) {
        this.messageService.fetchUnreadMessageCount();
      }
    }
    

    onLogout(){
      this.unreadMessageCount = 0; // Reset unread message count
      this.authService.logout();
    }

    ngOnDestroy(){
      this.authListenerSubs.unsubscribe();
      this.messageService.fetchUnreadMessageCount()
    }


    
  }
  












