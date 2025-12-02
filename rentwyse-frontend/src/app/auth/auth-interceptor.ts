// we are using this interceptor to place our token gotten in the auth in our request to the backend

//note after setup of this go to app module of this and add it as an object to the providers array

import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { AuthService } from "./auth.service";

//injecting my auth services
@Injectable()
export class AuthInterceptor implements HttpInterceptor{

    constructor(private authService: AuthService){}

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        const authToken:any = this.authService.getToken();

        // You have to clone the request to request before we manipulate it 
        const authRequest = req.clone({
            headers: req.headers.set('authorization', "Bearer " + authToken)
        })



        return next.handle(authRequest);
    }
}