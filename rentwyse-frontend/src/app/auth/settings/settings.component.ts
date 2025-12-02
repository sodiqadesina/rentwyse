import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ConfirmationDialogComponent1 } from './confirmation-dialog.component';
import { PasswordValidator } from '../password.validator';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  userForm: FormGroup;
  passwordForm: FormGroup;
  settingsSections = ['User Information', 'Privacy Settings', 'Account Preferences'];
  selectedSection: string = 'User Information';
  isLoading: boolean = true; // Define the isLoading flag here
  userId!: string;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmNewPassword = true;

  toggleCurrentPasswordVisibility(): void {
    this.hideCurrentPassword = !this.hideCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.hideNewPassword = !this.hideNewPassword;
  }

  toggleConfirmNewPasswordVisibility(): void {
    this.hideConfirmNewPassword = !this.hideConfirmNewPassword;
  }

  constructor(private authService: AuthService, private fb: FormBuilder, private dialog: MatDialog,
    private router: Router) {
    // Initialize userForm with the user data structure
    this.userForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      username: [{ value: '', disabled: true }],
      firstName: [''],
      lastName: [''],
      address: [''],
      city: [''],
      province: [''],
      zipcode: [''],
      country: [''],
      phone: ['']
    });

    

    // Initialize passwordForm with validators
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', Validators.required]
    }, {
      validator: PasswordValidator.match('newPassword', 'confirmNewPassword')
    });
  }

  ngOnInit(): void {
    // Load user details when the component initializes
    this.loadUserDetails();
  }

  loadUserDetails() {
    this.isLoading = true; // Set isLoading to true when the data load starts
    this.authService.getUserDetails().subscribe(
      response => {
        const userData = response.user;
        this.userId = userData._id;
        // Use patchValue to update form controls with the response data
        this.userForm.patchValue({
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          address: userData.address,
          city: userData.city,
          province: userData.province,
          zipcode: userData.zipcode,
          country: userData.country,
          phone: userData.phone
        });
        this.isLoading = false; // Set isLoading to false once data is loaded
      },
      error => {
        console.error('Error fetching user details', error);
        this.isLoading = false; // Ensure isLoading is set to false even on error
      }
    );
  }

 // Inside your SettingsComponent...

onChangePassword() {
  if (this.passwordForm.valid) {
    const currentPassword = this.passwordForm.get('currentPassword')?.value;
    const newPassword = this.passwordForm.get('newPassword')?.value;

    this.isLoading = true; // Set loading to true before the request
    this.authService.changePassword(this.userId, currentPassword, newPassword).subscribe(
      response => {
        // Handle success, perhaps show a message to the user
        console.log('Password successfully changed', response);
        this.isLoading = false; // Set loading to false after the request
        const dialogRef = this.dialog.open(ConfirmationDialogComponent1, {
          data: { title: 'Password Update', message: 'Your Password Update was successful!' }
        });

        dialogRef.afterClosed().subscribe(() => {
          // Redirect or perform other actions
          this.router.navigate(["/auth/settings"]);
        });
      },
      error => {
        // Handle error, perhaps show an error message
        console.error('Error changing password', error);
        this.isLoading = false; // Set loading to false even if there was an error
      }
    );
  }
}


  onSubmit() {
    if (this.userForm.valid) {
      this.isLoading = true; // Set isLoading to true when update starts
      
      this.authService.updateUserDetails(this.userId,this.userForm.value).subscribe(
        response => {
          // Open the dialog after successful update
          this.isLoading = false;
          const dialogRef = this.dialog.open(ConfirmationDialogComponent1, {
            data: { title: 'User Profile Update', message: 'Your Update was successful!' }
          });

          // Handle the dialog close event
          dialogRef.afterClosed().subscribe(() => {
            // Redirect or perform other actions
            this.router.navigate(["/auth/settings"]);
          });
        },
        error => {
          // Handle error case
          console.error('Error updating user details', error);
        }
      );
    }
  }

  selectSection(section: string) {
    this.selectedSection = section;
  }
}
