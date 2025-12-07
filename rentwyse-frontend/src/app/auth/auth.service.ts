import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthData } from "./auth-data.model";
import { Observable, Subject } from "rxjs";
import { Router } from "@angular/router";
import { environment } from "../../environments/environment";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmationDialogComponent } from "./signup/confirmation-dialog.component";
import { SocketService } from "../notification/socket.service";

const BACKEND_URL = environment.apiUrl + "/user";

interface StoredAuthData {
  token: string | null;
  expirationDate: Date;
  userId: string | null;
  role: "user" | "admin" | null;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private isAuthenticated = false;
  private token: string | undefined | null;
  private authStatusListener = new Subject<boolean>();
  private tokenTimer!: number;
  private userId!: any;
  private role: "user" | "admin" | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    public dialog: MatDialog,
    public socketService: SocketService
  ) {}

  // ---------- ROLE HELPERS ----------

  getRole(): "user" | "admin" | null {
    return this.role;
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }

  // ---------- SIGNUP / PROFILE ----------

  createUser(
    email: string,
    password: string,
    username: string,
    firstName?: string,
    lastName?: string,
    address?: string,
    city?: string,
    province?: string,
    zipcode?: string,
    country?: string,
    phone?: number
  ) {
    const authData: AuthData = {
      username: username,
      password: password,
      email: email,
      firstName: firstName,
      lastName: lastName,
      address: address,
      city: city,
      province: province,
      zipcode: zipcode,
      country: country,
      phone: phone,
    };

    this.http.post(BACKEND_URL + "/signup", authData).subscribe(
      () => {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent);

        dialogRef.afterClosed().subscribe(() => {
          this.router.navigate(["/auth/login"]);
        });
      },
      (error) => {
        this.authStatusListener.next(false);
      }
    );
  }

  getUserDetails(): Observable<any> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID not found");
    }
    return this.http.get<any>(BACKEND_URL + "/getUserDetails/" + userId);
  }

  updateUserDetails(userId: string, userDetails: any): Observable<any> {
    return this.http.put<any>(BACKEND_URL + "/updateUser/" + userId, userDetails);
  }

  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Observable<any> {
    const url = `${BACKEND_URL}/updatePassword/${userId}`;
    const body = {
      currentPassword: currentPassword,
      newPassword: newPassword,
    };
    return this.http.put(url, body);
  }

  // ---------- AUTH STATE API ----------

  getAuthStatusListener() {
    return this.authStatusListener.asObservable();
  }

  getIsAuth() {
    return this.isAuthenticated;
  }

  getUserId() {
    return this.userId;
  }

  getToken() {
    return this.token;
  }

  // ---------- LOGIN / AUTO-AUTH / LOGOUT ----------

    login(username: string, password: string) {
    const authData: AuthData = { username: username, password: password, email: "" };

    this.http
        .post<{
        token: string;
        expiresIn: number;
        userId: string;
        role: "user" | "admin";
        }>(BACKEND_URL + "/login", authData)
        .subscribe(
        (response) => {
            console.log("Auth Service res", response);
            const token = response.token;
            this.token = token;

            if (token) {
            const expireDuration = response.expiresIn;
            console.log("Token expires ", expireDuration);

            this.setAuthTimer(expireDuration);
            this.isAuthenticated = true;
            this.authStatusListener.next(true);
            this.userId = response.userId;
            this.role = response.role; // IMPORTANT: store role

            console.log("user id from server = " + response.userId);
            const now = new Date();
            const expirationDate = new Date(
                now.getTime() + expireDuration * 1000
            );
            console.log("Token expiry date", expirationDate);

            this.saveAuthData(token, expirationDate, this.userId, this.role);

            // 🚀 Redirect based on role
            if (this.role === "admin") {
                this.router.navigate(["/admin"]);
            } else {
                this.router.navigate(["/"]);
            }

            this.socketService.connect(this.userId);
            }
        },
        (error) => {
            this.authStatusListener.next(false);
            console.log("auth failed...err = ", error);
        }
        );
    }


  autoAuthUser() {
    const authInfo = this.getAuthData();
    console.log(authInfo);
    if (!authInfo || !authInfo.token) {
      return;
    }
    const now = new Date();
    const expiresIn = authInfo.expirationDate.getTime() - now.getTime();
    if (expiresIn > 0) {
      this.token = authInfo.token;
      this.isAuthenticated = true;
      this.userId = authInfo.userId;
      this.role = authInfo.role; // restore role

      this.setAuthTimer(expiresIn / 1000);
      this.authStatusListener.next(true);
      this.socketService.connect(this.userId);
    }
  }

  logout() {
    this.token = null;
    this.isAuthenticated = false;
    this.authStatusListener.next(false);
    clearTimeout(this.tokenTimer);
    this.clearAuthData();
    this.userId = null;
    this.role = null;
    this.socketService.disconnect();
    this.router.navigate(["/"]);
  }

  // ---------- INTERNAL HELPERS ----------

  private setAuthTimer(duration: number) {
    console.log("setting timer: " + duration);
    this.tokenTimer = setTimeout(() => {
      this.logout();
    }, duration * 1000) as unknown as number;
  }

  private saveAuthData(
    token: string,
    expirationDate: Date,
    userId: string,
    role: "user" | "admin" | null
  ) {
    localStorage.setItem("token", token);
    localStorage.setItem("expiration", expirationDate.toISOString());
    localStorage.setItem("userId", userId);
    if (role) {
      localStorage.setItem("role", role);
    }
  }

  private clearAuthData() {
    localStorage.removeItem("token");
    localStorage.removeItem("expiration");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
  }

  private getAuthData(): StoredAuthData | null {
    const token = localStorage.getItem("token");
    const expirationDate = localStorage.getItem("expiration");
    const userId = localStorage.getItem("userId");
    const role = localStorage.getItem("role") as "user" | "admin" | null;

    if (!token || !expirationDate) {
      return null;
    }

    return {
      token: token,
      expirationDate: new Date(expirationDate),
      userId: userId,
      role: role,
    };
  }
}
