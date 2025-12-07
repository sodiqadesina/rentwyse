import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "src/app/auth/auth.service";

@Component({
  selector: "app-admin-layout",
  templateUrl: "./admin-layout.component.html",
  styleUrls: ["./admin-layout.component.css"],
})
export class AdminLayoutComponent {
  constructor(private authService: AuthService, private router: Router) {}

  goToMainSite() {
    this.router.navigate(["/"]); // stays logged in as admin
  }

  logout() {
    this.authService.logout();
  }
}