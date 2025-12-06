import { Component ,  OnDestroy,  OnInit } from '@angular/core';
import {post} from '../post.model'
import { PostsService } from '../posts.service';
import { Subscription } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { AuthService } from 'src/app/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { InquiryDialogComponent } from '../../messaging/Inquiry-dialog/inquiry-dialog.component';
import { ConfirmationDialogComponent } from '../../messaging/messages/delete-confirmation.component';


@Component({
  selector: 'app-user-post-list',
  templateUrl: './user-post-list.component.html',
  styleUrls: ['./user-post-list.component.css']
})
export class UserPostListComponent implements OnInit, OnDestroy {
  posts: post[] = [];
  currentImageIndices: { [postId: string]: number } = {};

  private postsSub!: Subscription;
  totalPosts = 10;
  isLoading = false;
  postPerPage = 5;
  currentPage = 1;
  pageSizeOptions = [1,2,5,10]
  private authStatusSub!: Subscription;
  userIsAuth = false;
  userId!: any;


  constructor(public postsService: PostsService, private authService: AuthService, public dialog: MatDialog){}


ngOnInit(){
  this.isLoading = true;
  this.postsService.getPostsByUserId(this.postPerPage, this.currentPage);
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
}

openInquiryDialog(partnerId: string): void {
  this.dialog.open(InquiryDialogComponent, {
    width: '250px',
    data: { partnerId }
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
  this.postsService.getPostsByUserId(this.postPerPage, this.currentPage);

}

// Track which descriptions are expanded per post
expandedDescriptions: { [postId: string]: boolean } = {};

toggleDescription(postId: string): void {
  this.expandedDescriptions[postId] = !this.expandedDescriptions[postId];
}

isDescriptionExpanded(postId: string): boolean {
  return !!this.expandedDescriptions[postId];
}



onDelete(postId: string) {
  const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
    width: '350px',
    data: {
      title: 'Delete this listing?',
      message: 'This will hide the listing from renters. Are you sure you want to continue?'
    }
  });

  dialogRef.afterClosed().subscribe((confirmed: boolean) => {
    if (!confirmed) {
      return;
    }

    this.isLoading = true;

    this.postsService.deletePost(postId).subscribe(
      () => {
        // Reload the user’s listings after delete
        this.postsService.getPostsByUserId(this.postPerPage, this.currentPage);
      },
      () => {
        this.isLoading = false;
      }
    );
  });
}


ngOnDestroy(){
  this.postsSub.unsubscribe();
  this.authStatusSub.unsubscribe();
}

}