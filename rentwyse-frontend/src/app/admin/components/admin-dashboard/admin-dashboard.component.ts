import { Component, OnInit } from "@angular/core";
import { AdminService } from "../../admin.service";
import { forkJoin } from "rxjs";

interface AdminUser {
  _id: string;
  role: "user" | "admin";
  status: "active" | "banned" | string;
}

interface AdminPost {
  _id: string;
  status: "draft" | "active" | "flagged" | "deleted";
  featured?: boolean;
}

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.css"],
})
export class AdminDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage: string | null = null;

  // Top-level metrics
  totalUsers = 0;
  activeUsers = 0;
  bannedUsers = 0;
  adminCount = 0;

  totalPosts = 0;
  activePosts = 0;
  flaggedPosts = 0;
  deletedPosts = 0;
  featuredPosts = 0;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadOverview();
  }

  loadOverview(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Use existing admin endpoints and aggregate in the frontend.
    // We pull a reasonably large pageSize to keep it simple.
    forkJoin({
      usersRes: this.adminService.getUsers({ page: 1, pageSize: 500 }),
      postsRes: this.adminService.getPosts({ page: 1, pageSize: 500 }),
    }).subscribe({
      next: ({ usersRes, postsRes }) => {
        const users = (usersRes.users || []) as AdminUser[];
        const posts = (postsRes.posts || []) as AdminPost[];

        // --- USER METRICS ---
        this.totalUsers = usersRes.total ?? users.length;
        this.activeUsers = users.filter((u) => u.status === "active").length;
        this.bannedUsers = users.filter((u) => u.status === "banned").length;
        this.adminCount = users.filter((u) => u.role === "admin").length;

        // --- POST METRICS ---
        this.totalPosts = postsRes.total ?? posts.length;
        this.activePosts = posts.filter((p) => p.status === "active").length;
        this.flaggedPosts = posts.filter((p) => p.status === "flagged").length;
        this.deletedPosts = posts.filter((p) => p.status === "deleted").length;
        this.featuredPosts = posts.filter((p) => !!p.featured).length;

        this.isLoading = false;
      },
      error: (err) => {
        console.error("[AdminDashboard] loadOverview error", err);
        this.errorMessage = "Failed to load dashboard stats.";
        this.isLoading = false;
      },
    });
  }

  // ====== DERIVED PERCENTAGES FOR MINI-GRAPHS ======

  private safePercent(part: number, total: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return Math.round((part / total) * 100);
  }

  get activeUserPercent(): number {
    return this.safePercent(this.activeUsers, this.totalUsers);
  }

  get bannedUserPercent(): number {
    return this.safePercent(this.bannedUsers, this.totalUsers);
  }

  get adminRatioPercent(): number {
    return this.safePercent(this.adminCount, this.totalUsers);
  }

  get activePostPercent(): number {
    return this.safePercent(this.activePosts, this.totalPosts);
  }

  get flaggedPostPercent(): number {
    return this.safePercent(this.flaggedPosts, this.totalPosts);
  }

  get featuredPostPercent(): number {
    return this.safePercent(this.featuredPosts, this.totalPosts);
  }

  // to be used when you add more analytics later
  refresh(): void {
    this.loadOverview();
  }
}
