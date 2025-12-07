import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from "@angular/router";
import { AuthService } from "./auth.service";

@Injectable({ providedIn: "root" })
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    const isAuth = this.authService.getIsAuth();
    const isAdmin = this.authService.isAdmin();

    if (!isAuth || !isAdmin) {
      this.router.navigate(["/"]);
      return false;
    }

    return true;
  }
}
