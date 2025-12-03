import { Component ,  OnDestroy,  OnInit } from '@angular/core';
import {post} from '../post.model'
import { PostsService } from '../posts.service';
import { Subscription } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { AuthService } from 'src/app/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { InquiryDialogComponent } from '../../messaging/Inquiry-dialog/inquiry-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { Overlay } from '@angular/cdk/overlay';


@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.css']
})
export class PostListComponent implements OnInit, OnDestroy {
  posts: post[] = [];
  currentImageIndices: { [postId: string]: number } = {};

  private postsSub!: Subscription;
  totalPosts = 10;
  isLoading = false;
  postPerPage = 4;
  currentPage = 1;
  pageSizeOptions = [2,4,6,8,10]
  descriptionLimit = 160;
  private authStatusSub!: Subscription;
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


  constructor(public postsService: PostsService, private authService: AuthService, public dialog: MatDialog, private route: ActivatedRoute, private overlay: Overlay){}


ngOnInit(){
  this.isLoading = true;
  // this.postsService.getPosts(this.postPerPage, this.currentPage,);
  this.userId = this.authService.getUserId();
  this.postsSub = this.postsService.getPostUpdateListener().subscribe((postData: {posts: post[], postCount: number}) => {
    this.isLoading = false;
    this.totalPosts = postData.postCount;
    this.posts = postData.posts;
    console.log(this.posts)
    console.log(this.userId)
  });
  this.userIsAuth = this.authService.getIsAuth();
  this.authStatusSub = this.authService.getAuthStatusListener().subscribe(isAuthenticated =>{
    this.userIsAuth = isAuthenticated;
    this.userId = this.authService.getUserId();
    console.log(this.userId)
  })

  //Handling paramited  reroute
  this.route.queryParams.subscribe(params => {
    const city = params['city'];
    if (city) {
      this.filterCity = city;
      this.fetchPostsFilteredByCity(city);
    } else {
      this.fetchAllPosts();
    }
  });
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
  // Call your service method to fetch posts filtered by the city
  this.postsService.getPosts(this.postPerPage, this.currentPage, city);

}

fetchAllPosts() {
  // Existing code to fetch all posts
  this.postsService.getPosts(this.postPerPage, this.currentPage);

}

// NEW:
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
  return ((post.description || '').length > this.descriptionLimit);
}



openInquiryDialog(partnerId: string, postId: string, event: MouseEvent): void {
  const trigger = event.currentTarget as HTMLElement;

  // Helper to compute the position just under the button
  const computePosition = () => {
    const rect = trigger.getBoundingClientRect();

    const scrollTop =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollLeft =
      window.pageXOffset || document.documentElement.scrollLeft || 0;

    return {
      top: `${rect.bottom + scrollTop + 8}px`, // 8px gap under the button
      left: `${rect.left + scrollLeft}px`,
    };
  };

  const dialogRef = this.dialog.open(InquiryDialogComponent, {
    width: '300px',
    data: { partnerId, postId },
    hasBackdrop: false,                   // no grey background
    panelClass: 'inquiry-inline-dialog',  // for styling
    position: computePosition(),
    scrollStrategy: this.overlay.scrollStrategies.noop(),  
  });


  // Keep the dialog aligned with the button while scrolling
  const scrollHandler = () => {
    dialogRef.updatePosition(computePosition());
  };
  window.addEventListener('scroll', scrollHandler, true);

  // Close when clicking outside dialog & button
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

  // Delay to avoid the opening click closing it immediately
  setTimeout(() => {
    document.addEventListener('click', clickHandler, true);
  });

  // Cleanup listeners when dialog closes
  dialogRef.afterClosed().subscribe(() => {
    document.removeEventListener('click', clickHandler, true);
    window.removeEventListener('scroll', scrollHandler, true);
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

onChangePage(pageData: PageEvent){
  this.isLoading = true;
  console.log(pageData)
  this.currentPage = pageData.pageIndex + 1;
  this.postPerPage = pageData.pageSize;
  this.postsService.getPosts(this.postPerPage, this.currentPage);

}

onDelete(postId: string){
  this.isLoading = true;
  this.postsService.deletePost(postId).subscribe(()=> {
  this.postsService.getPosts(this.postPerPage,this.currentPage)
}, ()=>{
  this.isLoading = false
})
}

ngOnDestroy(){
  this.postsSub.unsubscribe();
  this.authStatusSub.unsubscribe();
}

}