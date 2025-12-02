import { NgModule } from "@angular/core";
import { LoginComponent } from './login/login.component';
import { SignupComponent} from './signup/signup.component'
import {  RouterModule, Routes } from "@angular/router";
import { SettingsComponent } from "./settings/settings.component";
import { AuthGuard } from './auth-guard';


const routes: Routes = [
        {path: 'login', component: LoginComponent},
        {path: 'signup', component: SignupComponent},
        {path: 'settings', component: SettingsComponent, canActivate: [AuthGuard]}
]

@NgModule({
    imports: [  
        RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
})

export class AuthRoutingModule {}