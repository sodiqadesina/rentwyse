import { Component, OnDestroy, OnInit } from "@angular/core";
import { NgForm } from "@angular/forms";
import { AuthService } from "../auth.service";
import { LoadingService } from "src/app/loading.service";
import { Subscription } from "rxjs";

@Component({
    // note we are not using selector here cause we dont need a physical component onthe screen we are just going to route users to this page !!
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit, OnDestroy{
    isLoading = false
    hide = true
    private authStatusSub!: Subscription;
    constructor(private authService: AuthService,){}

    ngOnInit(){
        this.authStatusSub = this.authService.getAuthStatusListener().subscribe(
         authStatus => {
             this.isLoading = false;
         }
        );
     }

    togglePasswordVisibility() {
        this.hide = !this.hide;
    }

    onLogin(form: NgForm){
        console.log(form.value)
        if(form.invalid){
            return
        }
        this.isLoading = true
        this.authService.login(form.value.username, form.value.password)
        // this.isLoading = false
    }

    ngOnDestroy(){
        this.authStatusSub.unsubscribe()
    }


}