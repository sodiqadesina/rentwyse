import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { AdminService } from '../../admin.service';

export interface AdminPost {
  _id: string;
  title: string;
  city?: string;
  rent?: number | null;
  price?: number | null;
  status: 'draft' | 'active' | 'flagged' | 'deleted';
  featured?: boolean;
  creator?: {
    username: string;
    email: string;
  };
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

@Component({
  selector: 'app-admin-posts',
  templateUrl: './admin-posts.component.html',
  styleUrls: ['./admin-posts.component.css']
})
export class AdminPostsComponent implements OnInit {
  // filter state
  searchTerm = '';
  filterStatus = '';
  filterCity = '';
  filterFeatured = '';

  // table data
  posts: AdminPost[] = [];
  displayedColumns: string[] = [
    'title',
    'city',
    'rent',
    'status',
    'featured',
    'creator',
    'createdAt',
    'actions'
  ];

  // paging
  pageIndex = 0;
  pageSize = 10;
  totalPosts = 0;

  isLoading = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
  this.isLoading = true;

  const params: any = {
    page: this.pageIndex + 1,
    pageSize: this.pageSize
  };

  if (this.searchTerm?.trim()) {
    params.search = this.searchTerm.trim();
  }
  if (this.filterStatus) {
    params.status = this.filterStatus;
  }
  if (this.filterCity) {
    params.city = this.filterCity;
  }
  if (this.filterFeatured) {
    params.featured = this.filterFeatured; // 'true' | 'false'
  }

  this.adminService.getPosts(params).subscribe({
    next: (res) => {
      this.posts = (res.posts || []).map((p: any) => ({
        ...p,
        // make sure rent is always numeric or null
        rent:
          typeof p.rent === 'number'
            ? p.rent
            : typeof p.price === 'number'
            ? p.price
            : null,
        // convert createdAt to Date if present
        createdAt: p.createdAt ? new Date(p.createdAt) : null,
      }));
      this.totalPosts = res.total ?? this.posts.length;
      this.isLoading = false;
    },
    error: (err) => {
      console.error('[AdminPosts] loadPosts error', err);
      this.isLoading = false;
    }
  });
}

  onApplyFilters(): void {
    this.pageIndex = 0;
    this.loadPosts();
  }

  onClearFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterCity = '';
    this.filterFeatured = '';
    this.pageIndex = 0;
    this.loadPosts();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPosts();
  }

  // --- actions ---

  setStatus(post: AdminPost, status: AdminPost['status']): void {
    if (post.status === status) {
      return;
    }
    this.adminService.updatePostStatus(post._id, status).subscribe({
      next: (updated) => {
        post.status = updated.post.status;
      },
      error: (err) => {
        console.error('[AdminPosts] updatePostStatus error', err);
      }
    });
  }

  toggleFeatured(post: AdminPost): void {
    const newValue = !post.featured;
    this.adminService.updatePostFeatured(post._id, newValue).subscribe({
      next: (updated) => {
        post.featured = updated.post.featured;
      },
      error: (err) => {
        console.error('[AdminPosts] updatePostFeatured error', err);
      }
    });
  }
}
