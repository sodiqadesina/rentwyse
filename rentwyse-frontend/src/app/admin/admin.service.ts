import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environment } from "../../environments/environment";

const BACKEND_URL = environment.apiUrl + "/admin";

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  city?: string;
  role: "user" | "admin";
  status: "active" | "banned";
  createdAt?: string;
  kycStatus?: string;
}

@Injectable({ providedIn: "root" })
export class AdminService {
  constructor(private http: HttpClient) {}

  getUsers(options: {
    page: number;
    pageSize: number;
    status?: string;
    role?: string;
    city?: string;
    search?: string;
  }) {
    let params = new HttpParams()
      .set("page", options.page.toString())
      .set("pageSize", options.pageSize.toString());

    if (options.status) params = params.set("status", options.status);
    if (options.role) params = params.set("role", options.role);
    if (options.city) params = params.set("city", options.city);
    if (options.search) params = params.set("search", options.search);

    return this.http.get<{
      users: AdminUser[];
      total: number;
      page: number;
      pageSize: number;
    }>(`${BACKEND_URL}/users`, { params });
  }

  updateUserStatus(userId: string, status: "active" | "banned") {
    return this.http.patch<{ message: string; user: AdminUser }>(
      `${BACKEND_URL}/users/${userId}/status`,
      { status }
    );
  }

  updateUserRole(userId: string, role: "user" | "admin") {
    return this.http.patch<{ message: string; user: AdminUser }>(
      `${BACKEND_URL}/users/${userId}/role`,
      { role }
    );
  }

  getPosts(params: any) {
  return this.http.get<{ posts: any[]; total: number }>(
    `${BACKEND_URL}/posts`,
    { params }
  );
}

updatePostStatus(postId: string, status: string) {
  return this.http.patch<{ message: string; post: any }>(
    `${BACKEND_URL}/posts/${postId}/status`,
    { status }
  );
}

updatePostFeatured(postId: string, featured: boolean) {
  return this.http.patch<{ message: string; post: any }>(
    `${BACKEND_URL}/posts/${postId}/featured`,
    { featured }
  );
}

}
