import { Component, OnInit, ViewChild } from "@angular/core";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { AdminService, AdminUser } from "../../admin.service";

interface UserStats {
  total: number;
  active: number;
  banned: number;
  admins: number;
  kycPending: number;
}

@Component({
  selector: "app-admin-users",
  templateUrl: "./admin-users.component.html",
  styleUrls: ["./admin-users.component.css"],
})
export class AdminUsersComponent implements OnInit {
  displayedColumns: string[] = [
    "username",
    "email",
    "city",
    "role",
    "status",
    "kycStatus",
    "createdAt",
    "actions",
  ];

  dataSource = new MatTableDataSource<AdminUser>([]);
  totalUsers = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = false;

  filterStatus = "";
  filterRole = "";
  searchTerm = "";

  stats: UserStats = {
    total: 0,
    active: 0,
    banned: 0,
    admins: 0,
    kycPending: 0,
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private computeStats(users: AdminUser[], totalFromServer: number) {
    const stats: UserStats = {
      total: totalFromServer,
      active: 0,
      banned: 0,
      admins: 0,
      kycPending: 0,
    };

    users.forEach((u) => {
      if (u.status === "active") stats.active++;
      if (u.status === "banned") stats.banned++;
      if (u.role === "admin") stats.admins++;
      if (u.kycStatus === "pending") stats.kycPending++;
    });

    this.stats = stats;
  }

  loadUsers() {
    this.isLoading = true;

    this.adminService
      .getUsers({
        page: this.pageIndex + 1,
        pageSize: this.pageSize,
        status: this.filterStatus || undefined,
        role: this.filterRole || undefined,
        search: this.searchTerm || undefined,
      })
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.users;
          this.totalUsers = res.total;
          this.computeStats(res.users, res.total);
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Failed to load users", err);
          this.isLoading = false;
        },
      });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadUsers();
  }

  onApplyFilters() {
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadUsers();
  }

  onClearFilters() {
    this.filterStatus = "";
    this.filterRole = "";
    this.searchTerm = "";
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
    this.loadUsers();
  }

  onRefresh() {
    this.loadUsers();
  }

  toggleStatus(user: AdminUser) {
    const newStatus = user.status === "active" ? "banned" : "active";
    this.adminService.updateUserStatus(user._id, newStatus).subscribe({
      next: (res) => {
        user.status = res.user.status;
        this.computeStats(this.dataSource.data, this.totalUsers);
      },
      error: (err) => {
        console.error("Failed to update user status", err);
      },
    });
  }

  toggleRole(user: AdminUser) {
    const newRole = user.role === "admin" ? "user" : "admin";
    this.adminService.updateUserRole(user._id, newRole).subscribe({
      next: (res) => {
        user.role = res.user.role;
        this.computeStats(this.dataSource.data, this.totalUsers);
      },
      error: (err) => {
        console.error("Failed to update user role", err);
      },
    });
  }
}
