import { NgModule } from "@angular/core";
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { AngularMaterialModule } from "../angular-material.module";
import { CommonModule } from "@angular/common";
import {  FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from "./auth-routing.module";
import { ConfirmationDialogComponent } from "./signup/confirmation-dialog.component";
import { SettingsComponent } from './settings/settings.component';
import { ConfirmationDialogComponent1 } from "./settings/confirmation-dialog.component";
import { FlexLayoutModule } from "@angular/flex-layout";
import { MatDividerModule } from '@angular/material/divider';




@NgModule({
    declarations: [
         LoginComponent,
        SignupComponent,
        ConfirmationDialogComponent,
        ConfirmationDialogComponent1,
        SettingsComponent,
    ],
        imports: [
            CommonModule,
            AngularMaterialModule,
            FormsModule,
            ReactiveFormsModule,
            AuthRoutingModule,
            FlexLayoutModule,
            MatDividerModule
        ]
})
export class AuthModule {}