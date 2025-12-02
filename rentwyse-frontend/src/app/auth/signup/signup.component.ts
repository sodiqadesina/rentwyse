import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';
import { PasswordValidator } from '../password.validator';

@Component({
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.css']
})
export class SignupComponent implements OnInit, OnDestroy {
    signupForm: FormGroup;
    isLoading = false;
    private authStatusSub!: Subscription;

    // 0 = Account details, 1 = Personal details, 2 = Address & phone
    currentStep = 0;

    constructor(private fb: FormBuilder, public authService: AuthService) {
        // Initialize the form group here in the constructor
        this.signupForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            username: ['', Validators.required],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            address: ['', Validators.required],
            city: ['', Validators.required],
            province: ['', Validators.required],
            zipcode: ['', Validators.required],
            country: ['', Validators.required],
            phone: ['', [Validators.required]]
        }, { validator: PasswordValidator.match('password', 'confirmPassword') });
    }

    ngOnInit() {
        this.authStatusSub = this.authService.getAuthStatusListener().subscribe(
            authStatus => {
                this.isLoading = authStatus;
            }
        );
    }

    /**
     * Move to the next step if the current step is valid
     */
    nextStep() {
        if (this.currentStep < 2 && this.isCurrentStepValid()) {
            this.currentStep++;
        }
    }

    /**
     * Move back a step
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }

    /**
     * Validate only the controls relevant to the current step
     */
    private isCurrentStepValid(): boolean {
        if (!this.signupForm) {
            return false;
        }

        const stepControlsMap: string[][] = [
            // Step 0: account details
            ['email', 'username', 'password', 'confirmPassword'],
            // Step 1: personal details
            ['firstName', 'lastName'],
            // Step 2: address & phone
            ['address', 'city', 'province', 'zipcode', 'country', 'phone']
        ];

        const controlsForStep = stepControlsMap[this.currentStep] || [];

        // Mark controls as touched so errors show in the UI
        controlsForStep.forEach(name => {
            const control = this.signupForm.get(name);
            if (control) {
                control.markAsTouched();
                control.updateValueAndValidity();
            }
        });

        // For step 0 also ensure the group doesn't have password mismatch
        if (this.currentStep === 0 && this.signupForm.hasError('passwordMismatch')) {
            return false;
        }

        // All controls in this step must be valid
        return controlsForStep.every(name => {
            const control = this.signupForm.get(name);
            return !!control && control.valid;
        });
    }

    onSignup() {
        // onSignup is only called on the last step (step 2) submit
        if (this.signupForm.invalid) {
            // Mark all controls as touched to show errors if user somehow submits early
            Object.keys(this.signupForm.controls).forEach(key => {
                const control = this.signupForm.get(key);
                if (control) {
                    control.markAsTouched();
                    control.updateValueAndValidity();
                }
            });
            return;
        }

        this.isLoading = true;

        this.authService.createUser(
            this.signupForm.value.email,
            this.signupForm.value.password,
            this.signupForm.value.username,
            this.signupForm.value.firstName,
            this.signupForm.value.lastName,
            this.signupForm.value.address,
            this.signupForm.value.city,
            this.signupForm.value.province,
            this.signupForm.value.zipcode,
            this.signupForm.value.country,
            this.signupForm.value.phone
        );
    }

    ngOnDestroy() {
        this.authStatusSub.unsubscribe();
    }
}
