// we are using this interceptor to handle errors gotten in the response of the backend

//note after setup of this go to app module of this and add it as an object to the providers array

import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Observable, catchError, throwError } from "rxjs";
import { ErrorComponent } from "./error/error.component";

//injecting my auth services
@Injectable()
export class ErrorInterceptor implements HttpInterceptor{

    constructor(private dialog: MatDialog){}

    intercept(req: HttpRequest<any>, next: HttpHandler) {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse)=>{
                console.log('this is from interceptor');
                console.log( error);
                //alert(error.error.error.message)
                let errorMessage = "An Unknown Error Occurred !!!"
                if(error.error.message){
                    errorMessage =error.error.message
                }
                this.dialog.open(ErrorComponent, {data: {message: errorMessage}});

                return throwError(error)
            })
        );
    }
}