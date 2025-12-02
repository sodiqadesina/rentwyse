import { ComponentFixture, TestBed, async } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; 
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '../auth.service';
import { of } from 'rxjs';

class MockAuthService {
  getAuthStatusListener() {
    return of(false); // Or whatever default value you want to return
  }
  
  login(username: string, password: string) {
    return; // Mock implementation
  }
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule
      ],
      declarations: [
        LoginComponent,
        MatProgressSpinnerModule
      ],
      providers: [
        { provide: AuthService, useClass: MockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.hide).toBeTrue();
    component.togglePasswordVisibility();
    expect(component.hide).toBeFalse();
  });

  it('should not call the login method of AuthService if form is invalid', () => {
    const spy = spyOn(authService, 'login');
    const form = {
      invalid: true,
      value: {
        username: '',
        password: ''
      }
    };
    component.onLogin(form as any);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should call the login method of AuthService if form is valid', () => {
    const spy = spyOn(authService, 'login').and.callThrough();
    const form = {
      invalid: false,
      value: {
        username: 'test',
        password: 'password123'
      }
    };
    component.onLogin(form as any);
    expect(spy).toHaveBeenCalledWith('test', 'password123');
  });
});
