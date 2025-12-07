import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AdminLayoutComponent } from "./components/admin-layout/admin-layout.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { AdminUsersComponent } from "./components/admin-users/admin-users.component";
import { AdminPostsComponent } from "./components/admin-posts/admin-posts.component";
import { AdminGuard } from "../auth/admin-guard";

const routes: Routes = [
  {
    path: "",
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],          
    children: [
      { path: "", component: AdminDashboardComponent },
      { path: "users", component: AdminUsersComponent },
      { path: "posts", component: AdminPostsComponent },

      // future:
      // { path: "conversations", component: AdminConversationsComponent },
      // { path: "kyc", component: AdminKycListComponent },
      // { path: "settings", component: AdminSettingsComponent },
      // { path: "audit", component: AdminAuditLogComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
