import { NgModule } from "@angular/core";
import { AngularMaterialModule } from "../angular-material.module";
import { CommonModule } from "@angular/common";
import { InquiryDialogComponent } from "./Inquiry-dialog/inquiry-dialog.component";
import { FormsModule } from '@angular/forms';
import { MessagesComponent } from "./messages/messages.component";
import { RouterModule } from "@angular/router";
import { MatListModule } from '@angular/material/list';
import { ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDatepickerModule } from "@angular/material/datepicker";
import {ConfirmationDialogComponent} from "./messages/delete-confirmation.component"
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
declarations: [
    InquiryDialogComponent,
    MessagesComponent,
    ConfirmationDialogComponent
],
imports: [
CommonModule,
AngularMaterialModule,
FormsModule,
RouterModule,
MatListModule,
ReactiveFormsModule,
MatBadgeModule,
MatDatepickerModule,
MatDialogModule,
]

})
export class MessagingModule {}