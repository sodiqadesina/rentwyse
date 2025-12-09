import { Component, OnDestroy, OnInit } from '@angular/core';
import { post } from '../post.model';
import { PostsService } from '../posts.service';
import { Subscription } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { AuthService } from 'src/app/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { InquiryDialogComponent } from '../../messaging/Inquiry-dialog/inquiry-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { Overlay } from '@angular/cdk/overlay';
import { Router } from '@angular/router';
import { MessageService } from 'src/app/messaging/messaging.service';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.css']
})
export class PostListComponent implements OnInit, OnDestroy {
  posts: post[] = [];
  currentImageIndices: { [postId: string]: number } = {};

  private postsSub!: Subscription;
  private authStatusSub!: Subscription;

  totalPosts = 10;
  isLoading = false;
  postPerPage = 4;
  currentPage = 1;
  pageSizeOptions = [2, 4, 6, 8, 10];
  descriptionLimit = 160;

  userIsAuth = false;
  userId!: any;

  filterCity = '';
  filterBedroom!: number;
  filterBathroom!: number;
  filterFurnished!: boolean;
  filterParkingAvailable!: boolean;
  filterMinPrice!: number;
  filterMaxPrice!: number;

  descriptionExpanded: { [postId: string]: boolean } = {};
  conversationsByPostId: { [postId: string]: any } = {};

  // --- MAP STATE ---
  mapCenter: google.maps.LatLngLiteral = { lat: 43.45, lng: -80.49 }; // default Waterloo-ish
  mapZoom = 11;
  mapOptions: google.maps.MapOptions = {
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: true,
    zoomControl: true,
  };
 mapMarkers: {
  postId: string;
  position: google.maps.LatLngLiteral;
  label?: google.maps.MarkerLabel;
  options?: google.maps.MarkerOptions;
 }[] = [];

  constructor(
    public postsService: PostsService,
    private authService: AuthService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private overlay: Overlay,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.isLoading = true;

    // Set initial user
    this.userId = this.authService.getUserId();

    // Listen for posts
    this.postsSub = this.postsService
      .getPostUpdateListener()
      .subscribe((postData: { posts: post[]; postCount: number }) => {
        this.isLoading = false;
        this.totalPosts = postData.postCount;
        this.posts = postData.posts;
        console.log(this.posts);
        console.log(this.userId);

        this.buildMapMarkersFromPosts();
      });

    // Auth state + conversations
    this.userIsAuth = this.authService.getIsAuth();
    if (this.userIsAuth) {
      this.loadUserConversations();
    }

    this.authStatusSub = this.authService
      .getAuthStatusListener()
      .subscribe((isAuthenticated) => {
        this.userIsAuth = isAuthenticated;
        this.userId = this.authService.getUserId();
        console.log(this.userId);

        if (this.userIsAuth) {
          this.loadUserConversations();
        } else {
          this.conversationsByPostId = {};
        }
      });

    // Handling param-based reroute / filters
    this.route.queryParams.subscribe((params) => {
      const city = params['city'];
      if (city) {
        this.filterCity = city;
        this.fetchPostsFilteredByCity(city);
      } else {
        this.fetchAllPosts();
      }
    });
  }

  // Build markers from posts with lat/lng
private buildMapMarkersFromPosts(): void {
  const markers: {
    postId: string;
    position: google.maps.LatLngLiteral;
    options: google.maps.MarkerOptions;
  }[] = [];

  this.posts.forEach((p: post) => {
    let lat: number | undefined;
    let lng: number | undefined;

    // 1) Prefer explicit lat/lng
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      lat = p.lat;
      lng = p.lng;
    }
    // 2) Fallback to GeoJSON location.coordinates [lng, lat]
    else if (
      p.location &&
      Array.isArray(p.location.coordinates) &&
      p.location.coordinates.length === 2
    ) {
      lng = p.location.coordinates[0];
      lat = p.location.coordinates[1];
    }

    if (lat == null || lng == null) {
      return; // skip posts with no coords
    }

    markers.push({
      postId: p._id,
      position: { lat, lng },
      options: {
        label: {
          text: `$${p.price}`,
          className: p.featured
            ? 'map-marker-label map-marker-label--featured'
            : 'map-marker-label',
        },
        zIndex: p.featured ? 2 : 1,
        clickable: true,
      },
    });
  });

  this.mapMarkers = markers;

  console.log('[MAP] posts:', this.posts);
  console.log('[MAP] built markers:', this.mapMarkers);

  if (this.mapMarkers.length > 0) {
    this.mapCenter = this.mapMarkers[0].position;
    this.mapZoom = 12;
  }
}




  fitMapToMarkers(): void {
    // Basic implementation: re-center on first marker and a reasonable zoom
    if (this.mapMarkers.length === 0) {
      return;
    }
    this.mapCenter = this.mapMarkers[0].position;
    this.mapZoom = 12;
  }

  onMarkerClick(postId: string): void {
    // Scroll the corresponding card into view
    const cardEl = document.querySelector(
      `.rental-card[data-post-id="${postId}"]`
    ) as HTMLElement | null;

    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      cardEl.classList.add('rental-card--highlight');

      setTimeout(() => {
        cardEl.classList.remove('rental-card--highlight');
      }, 1500);
    }
  }

  applyFilters() {
    this.isLoading = true;
    this.postsService.getPosts(
      this.postPerPage,
      this.currentPage,
      this.filterCity,
      this.filterBedroom,
      this.filterBathroom,
      this.filterFurnished,
      this.filterParkingAvailable,
      this.filterMinPrice,
      this.filterMaxPrice
    );
  }

  private fetchPostsFilteredByCity(city: string) {
    this.postsService.getPosts(this.postPerPage, this.currentPage, city);
  }

  fetchAllPosts() {
    this.postsService.getPosts(this.postPerPage, this.currentPage);
  }

  onClearFilters() {
    this.filterCity = '';
    this.filterBedroom = undefined as any;
    this.filterBathroom = undefined as any;
    this.filterFurnished = undefined as any;
    this.filterParkingAvailable = undefined as any;
    this.filterMinPrice = undefined as any;
    this.filterMaxPrice = undefined as any;

    this.currentPage = 1;
    this.isLoading = true;
    this.fetchAllPosts();
  }

  isDescriptionExpanded(postId: string): boolean {
    return !!this.descriptionExpanded[postId];
  }

  toggleDescription(postId: string): void {
    this.descriptionExpanded[postId] = !this.descriptionExpanded[postId];
  }

  isDescriptionLong(post: post): boolean {
    return (post.description || '').length > this.descriptionLimit;
  }

  private loadUserConversations(): void {
    if (!this.userIsAuth || !this.userId) {
      this.conversationsByPostId = {};
      return;
    }

    this.messageService.getAllConversationsForUser(this.userId).subscribe({
      next: (conversations: any[]) => {
        const map: { [postId: string]: any } = {};
        conversations.forEach((c: any) => {
          const postId = c.postId?._id || c.postId;
          if (postId) {
            map[postId] = c;
          }
        });
        this.conversationsByPostId = map;
      },
      error: (err) => {
        console.error('Failed to load conversations for user', err);
        this.conversationsByPostId = {};
      }
    });
  }

  hasConversationForPost(postId: string): boolean {
    return !!this.conversationsByPostId[postId];
  }

  viewMessagesForPost(postId: string): void {
    const convo = this.conversationsByPostId[postId];
    if (!convo) return;
    this.router.navigate(['/messages', convo._id]);
  }

  openInquiryDialog(partnerId: string, postId: string, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;

    const computePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft || 0;

      return {
        top: `${rect.bottom + scrollTop + 8}px`,
        left: `${rect.left + scrollLeft}px`,
      };
    };

    const dialogRef = this.dialog.open(InquiryDialogComponent, {
      width: '300px',
      data: { partnerId, postId },
      hasBackdrop: false,
      panelClass: 'inquiry-inline-dialog',
      position: computePosition(),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
    });

    const scrollHandler = () => {
      dialogRef.updatePosition(computePosition());
    };
    window.addEventListener('scroll', scrollHandler, true);

    const clickHandler = (evt: MouseEvent) => {
      const dialogEl = document.querySelector(
        '.inquiry-inline-dialog'
      ) as HTMLElement | null;

      const target = evt.target as Node;

      const clickedInsideDialog = dialogEl && dialogEl.contains(target);
      const clickedOnButton = trigger.contains(target);

      if (!clickedInsideDialog && !clickedOnButton) {
        dialogRef.close();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', clickHandler, true);
    });

    dialogRef.afterClosed().subscribe((result) => {
      document.removeEventListener('click', clickHandler, true);
      window.removeEventListener('scroll', scrollHandler, true);

      if (result && result.conversationId && result.postId) {
        this.conversationsByPostId[result.postId] = {
          _id: result.conversationId,
          postId: result.postId
        };
      }
    });
  }

  previousImage(postId: string) {
    if (this.currentImageIndices[postId] > 0) {
      this.currentImageIndices[postId]--;
    }
  }

  nextImage(postId: string, maxIndex: number) {
    if (!this.currentImageIndices[postId]) {
      this.currentImageIndices[postId] = 0;
    }
    if (this.currentImageIndices[postId] < maxIndex - 1) {
      this.currentImageIndices[postId]++;
    }
  }

  onChangePage(pageData: PageEvent) {
    this.isLoading = true;
    console.log(pageData);
    this.currentPage = pageData.pageIndex + 1;
    this.postPerPage = pageData.pageSize;
    this.postsService.getPosts(this.postPerPage, this.currentPage);
  }

  onDelete(postId: string) {
    this.isLoading = true;
    this.postsService.deletePost(postId).subscribe(
      () => {
        this.postsService.getPosts(this.postPerPage, this.currentPage);
      },
      () => {
        this.isLoading = false;
      }
    );
  }

  ngOnDestroy() {
    this.postsSub.unsubscribe();
    this.authStatusSub.unsubscribe();
  }
}
