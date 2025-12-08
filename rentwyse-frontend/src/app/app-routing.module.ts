import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PostListComponent } from "./posts/post-list/post-list.component";
import { PostCreateComponent } from "./posts/post-create/post-create.component";
import { UserPostListComponent } from "./posts/user-post-list/user-post-list.component";
import { AuthGuard } from "./auth/auth-guard";
import { HomeComponent } from "./home/home.component";
import { MessagesComponent } from "./messaging/messages/messages.component";
import { AdminGuard } from "./auth/admin-guard";

const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "list", component: PostListComponent,},
  {
    path: "create",
    component: PostCreateComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "edit/:postId",
    component: PostCreateComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "auth",
    loadChildren: () =>
      import("./auth/auth.module").then((m) => m.AuthModule),
  }, // Lazy loading the auth routes
  { path: "message", component: MessagesComponent, canActivate: [AuthGuard] },
  {
    path: "messages/:conversationId",
    component: MessagesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "my-listing",
    component: UserPostListComponent,
    canActivate: [AuthGuard],
  },

  // NEW: Admin area (lazy loaded)
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.module").then((m) => m.AdminModule),
    canActivate: [AdminGuard], // ensures only admins can even enter this lazy module
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [AuthGuard],
})
export class AppRoutingModule {}
