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
  private authListenerSubs!: Subscription;
  unreadMessageCount: number = 0;
  userIsAuth = false;

  // NEW: track admin role
  isAdmin = false;

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  toggleNav() {
    const navList = document.querySelector('.nav-list');
    if (navList) {
      navList.classList.toggle('active');
    }
  }

  ngOnInit() {
    this.userIsAuth = this.authService.getIsAuth();

    if (this.userIsAuth) {
      this.loadUserRole();
      this.messageService.fetchUnreadMessageCount();
    }

    // unread count stream
    this.messageService.getUnreadMessageCount().subscribe(count => {
      this.unreadMessageCount = count;
      console.log('unreadMessageCount:', count);
    });

    // auth status stream
    this.authListenerSubs = this.authService
      .getAuthStatusListener()
      .subscribe(isAuthenticated => {
        this.userIsAuth = isAuthenticated;

        if (isAuthenticated) {
          this.loadUserRole();
          this.messageService.fetchUnreadMessageCount();
        } else {
          this.isAdmin = false;
          this.unreadMessageCount = 0;
        }
      });
  }

  // NEW: load role from backend via getUserDetails() (Observable)
  private loadUserRole(): void {
    this.authService.getUserDetails().subscribe({
      next: (res) => {
        // NOTE: backend returns { user: { ... } }
        this.isAdmin = res?.user?.role === 'admin';
        console.log('[Header] isAdmin?', this.isAdmin, 'role:', res?.user?.role);
      },
      error: (err) => {
        console.error('[Header] Failed to load user details for role check', err);
        this.isAdmin = false;
      }
    });
  }

  onLogout() {
    this.unreadMessageCount = 0;
    this.isAdmin = false;
    this.authService.logout();
  }

  ngOnDestroy() {
    if (this.authListenerSubs) {
      this.authListenerSubs.unsubscribe();
    }
    this.messageService.fetchUnreadMessageCount();
  }
}
