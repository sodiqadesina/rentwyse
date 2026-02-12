import { Component, OnInit } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { AuthService } from "./auth/auth.service";
import { environment } from "../environments/environment";


@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit {
  // true when current URL starts with /admin
  isAdminRoute = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // restore auth state on refresh
    this.authService.autoAuthUser();
    this.warmUpBackend();

    // watch route changes to know when we're on /admin
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        this.isAdminRoute = url.startsWith("/admin");
      });
  }
  private warmUpBackend() {
  fetch(`${environment.apiUrl}/health`, {
    method: "GET",
    cache: "no-store",
    mode: "cors",
  }).catch(() => {
    // intentionally ignored - this request is only used to wake the backend
  });
}

}
