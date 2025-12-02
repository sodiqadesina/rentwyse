import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthData } from "./auth-data.model"
import { Observable, Subject } from "rxjs";
import { Router } from "@angular/router";
import { environment } from '../../environments/environment';
import { LoadingService } from "../loading.service";
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from "./signup/confirmation-dialog.component";
import { SocketService } from '../notification/socket.service';

const BACKEND_URL =    environment.apiUrl   + '/user/';

@Injectable({providedIn: "root"})




export class AuthService{
    private isAuthenticated = false;
    private token: string | undefined | null; // token is private here to use it outside use the getToken method
    private authStatusListener = new Subject<boolean>();
    private tokenTimer!:  number;
    private userId!: any;
constructor(private http: HttpClient, private router: Router, public dialog: MatDialog, public socketService: SocketService, ){}

  
    createUser(
        email: string,
        password: string,
        username: string,
        firstName?: string,
        lastName?: string,
        address?: string,
        city?: string,
        province?: string,
        zipcode?: string,
        country?: string,
        phone?: number
    ) {
        const authData: AuthData = {
            username: username,
            password: password,
            email: email,
            firstName: firstName,
            lastName: lastName,
            address: address,
            city: city,
            province: province,
            zipcode: zipcode,
            country: country,
            phone: phone
        };
        this.http.post(BACKEND_URL + "/signup", authData).subscribe(() => {
            // Open the dialog
        const dialogRef = this.dialog.open(ConfirmationDialogComponent);

        // After the user clicks 'OK', redirect to the login page
        dialogRef.afterClosed().subscribe(() => {
            this.router.navigate(["/auth/login"]);
        });
        }, error => {
            this.authStatusListener.next(false)
        });
    }

    getUserDetails(): Observable<any> {
        // Using the userId that you already have after login to make the request
        const userId = this.getUserId(); 
        if (!userId) {
          throw new Error('User ID not found');
        }
        return this.http.get<any>(BACKEND_URL + "getUserDetails/" + userId);
      }

      updateUserDetails(userId: string, userDetails: any): Observable<any>{ 

        return this.http.put<any>(BACKEND_URL + "updateUser/" + userId, userDetails);
        
      }
    
      changePassword(userId: string, currentPassword: string, newPassword: string): Observable<any> {
        const url = `${BACKEND_URL}/updatePassword/${userId}`;
        const body = {
          currentPassword: currentPassword,
          newPassword: newPassword
        };
        return this.http.put(url, body);
      }
    
    

    getAuthStatusListener(){
        return this.authStatusListener.asObservable();
    }

    getIsAuth(){
        return this.isAuthenticated
    }

    getUserId(){
        return  this.userId
    }

    getToken(){// 
        return this.token
    }


    login(username: string, password:string){
        const authData: AuthData = {username: username, password: password, email: ""}

        this.http.post<{token: string, expiresIn: number, userId: string}>(BACKEND_URL+ "login", authData).subscribe(response =>{
            console.log('Auth Service res'+response)
            const token = response.token
            this.token = token;
            if(token){
                const expireDuration = response.expiresIn
                console.log("Token expires "+ expireDuration)
                this.setAuthTimer(expireDuration)
                this.isAuthenticated = true;
                this.authStatusListener.next(true);
                this.userId = response.userId;
                console.log("user id from server = " + response.userId)
                const now = new Date();
                const expirationDate = new Date (now.getTime() + expireDuration * 1000) ;
                console.log("Token expiry date"+expirationDate)
                this.saveAuthData(token, expirationDate, this.userId)
                this.router.navigate(['/']);
                this.socketService.connect(this.userId); // connecting to the socket server on login
            }
        },error =>{
            this.authStatusListener.next(false);
            console.log("auth failed...err = ", error)
        })
    }


    autoAuthUser(){ // we are using this one to Authorize the user if the page gets reloaded making reference to the  token and expirationDate stored in the local storage
        const authInfo = this.getAuthData()
        console.log(authInfo)
        if(!authInfo){
            return
        }
        const now = new Date();
        const expiresIn = authInfo!.expirationDate.getTime() - now.getTime();
        if(expiresIn > 0){
            this.token = authInfo!.token;
            this.isAuthenticated = true;
            this.userId = authInfo.userId;
            this.setAuthTimer(expiresIn / 1000)
            this.authStatusListener.next(true)
                // Reconnecting to the WebSocket server when the page refreshes and we use autoAuthUser
            this.socketService.connect(this.userId);
        }
        
    }





    logout(){
        this.token = null;
        this.isAuthenticated = false;
        this.authStatusListener.next(false);
        clearTimeout(this.tokenTimer);
        this.clearAuthData();
        this.userId = null;
        this.socketService.disconnect();
        //this.socketService.disconnectMessageListener();
        this.router.navigate(['/']);
    
    }

    private setAuthTimer(duration: number){
        console.log("setting timer: "+ duration)
        this.tokenTimer = setTimeout(()=>{ // we setting up a timer so we know when token is expired on the backend
            this.logout();
        }, duration * 1000) as unknown as number
    }

    private saveAuthData(token: string, expirationDate: Date, userId: string){// storing the token expiring date in the browsers local storage 
        localStorage.setItem('token', token);
        localStorage.setItem('expiration', expirationDate.toISOString());
        localStorage.setItem('userId', userId)
    }

    private clearAuthData(){
        localStorage.removeItem('token');
        localStorage.removeItem('expiration');
        localStorage.removeItem('userId');
    }

    private getAuthData(){ // we are using this to get items stored in the local storage 
        const token = localStorage.getItem('token');
        const expirationDate =  localStorage.getItem('expiration')
        const userId = localStorage.getItem('userId')
        return{
            token:token,
            expirationDate: new Date(expirationDate as unknown as Date),
            userId: userId
        }
    
    }

}