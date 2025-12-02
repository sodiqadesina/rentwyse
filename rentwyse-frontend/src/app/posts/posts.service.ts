import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { post } from './post.model';
import { environment } from '../../environments/environment';

const BACKEND_URL = environment.apiUrl + '/posts/';

@Injectable({ providedIn: 'root' })
export class PostsService {
    private posts: post[] = [];
    private postsUpdated = new Subject<{ posts: post[], postCount: number }>();

    constructor(private http: HttpClient, private router: Router) {}

    getPosts(postsPerPage: number, currentPage: number,city?: string, bedroom?: number, bathroom?: number, furnished?: boolean, parkingAvailable?: boolean, minPrice?: number, maxPrice?: number){
        let queryParams = `?pagesize=${postsPerPage}&page=${currentPage}`;
            if (city) queryParams += `&city=${city}`;
            if (bedroom) queryParams += `&bedroom=${bedroom}`;
            if (bathroom) queryParams += `&bathroom=${bathroom}`;
            if (furnished) queryParams += `&furnished=${furnished}`;
            if (parkingAvailable) queryParams += `&parkingAvailable=${parkingAvailable}`;
            if (minPrice) queryParams += `&minPrice=${minPrice}`;
            if (maxPrice) queryParams += `&maxPrice=${maxPrice}`;
          

        this.http
            .get<{ message: string, posts: any[], maxPost: number }>(BACKEND_URL + queryParams)
            .pipe(map(postData => {
                return {
                    posts: postData.posts.map(post => {
                        return {
                            _id: post._id,
                            title: post.title,
                            description: post.description,
                            imagePath: post.imagePath,
                            creator: post.creator,
                            // Add all the new fields here
                            bedroom: post.bedroom,
                            bathroom: post.bathroom,
                            typeOfProperty: post.typeOfProperty,
                            furnished: post.furnished,
                            parkingAvailable: post.parkingAvailable,
                            rentType: post.rentType,
                            dateListed: post.dateListed,
                            dateAvailableForRent: post.dateAvailableForRent,
                            city: post.city,
                            address: post.address,
                            province: post.province,
                            zipcode: post.zipcode,
                            country: post.country,
                            price: post.price,
                        };
                    }),
                    maxPost: postData.maxPost
                };
            }))
            .subscribe((postData) => {
                console.log(postData)
                this.posts = postData.posts;
                this.postsUpdated.next({posts: [...this.posts], postCount: postData.maxPost});
            })
        }

    getPostsByUserId(postsPerPage: number, currentPage: number){
        const queryParams = `?pagesize=${postsPerPage}&page=${currentPage}`;
        this.http
            .get<{ message: string, posts: any[], maxPost: number }>(BACKEND_URL + '/user-post/ID/'+  queryParams)
            .pipe(map(postData => {
                return {
                    posts: postData.posts.map(post => {
                        return {
                            _id: post._id,
                            title: post.title,
                            description: post.description,
                            imagePath: post.imagePath,
                            creator: post.creator,
                            // Add all the new fields here
                            bedroom: post.bedroom,
                            bathroom: post.bathroom,
                            typeOfProperty: post.typeOfProperty,
                            furnished: post.furnished,
                            parkingAvailable: post.parkingAvailable,
                            rentType: post.rentType,
                            dateListed: post.dateListed,
                            dateAvailableForRent: post.dateAvailableForRent,
                            city: post.city,
                            address: post.address,
                            province: post.province,
                            price: post.price,
                            zipcode: post.zipcode,
                            country: post.country,
                        };
                    }),
                    maxPost: postData.maxPost
                };
            }))
            .subscribe((postData) => {
                console.log(postData)
                this.posts = postData.posts;
                this.postsUpdated.next({posts: [...this.posts], postCount: postData.maxPost});
            })
        }

    getPost(id: string): Observable<post> {
        return this.http.get<post>(BACKEND_URL + id);
    }

    getPostUpdateListener() {
        return this.postsUpdated.asObservable();
    }

    addPost(title: string, 
        description: string, 
        image: File[], 
        bedroom: number, bathroom: number, 
        typeOfProperty: string, furnished: boolean, 
        parkingAvailable: boolean, rentType: string, 
        dateListed: Date, dateAvailableForRent: Date, city: string, 
        address: string, province: string, zipcode: string, price: number, country: string,) {

        const postData = new FormData();
        postData.append('title', title);
        postData.append('description', description);
        image.forEach((file, index) => {
          postData.append('image', file, file.name);
        });
        postData.append('bedroom', bedroom.toString());
        postData.append('bathroom', bathroom.toString());
        postData.append('typeOfProperty', typeOfProperty);
        postData.append('furnished', furnished.toString());
        postData.append('parkingAvailable', parkingAvailable.toString());
        postData.append('rentType', rentType);
        postData.append('dateListed', dateListed.toISOString());
        postData.append('dateAvailableForRent', dateAvailableForRent.toISOString());
        postData.append('city', city);
        postData.append('address', address);
        postData.append('province', province);
        postData.append('zipcode', zipcode);
        postData.append('price', price.toString());
        postData.append('country', country);
        this.http.post<{ message: string, post: any }>(BACKEND_URL, postData)
          .subscribe(responseData => {



            console.log(postData)
            //should redirect to the user list of posts page
            this.router.navigate(["/my-listing"]);
          });
    }



    updatePost(
    id: string, 
    title: string, 
    description: string, 
    image: File[] , 
    bedroom: number, 
    bathroom: number, 
    typeOfProperty: string, 
    furnished: boolean, 
    parkingAvailable: boolean, 
    rentType: string, 
    dateListed: Date, 
    dateAvailableForRent: Date,
    city: string,
    address: string,
    province: string,
    zipcode: string,
    price: number,
    country: string,
    creator: any
    ){
        let postData: FormData | post;
    
        if (image && image.length > 0 && typeof(image[0]) === 'object') {
            postData = new FormData();
            postData.append("id", id);
            postData.append("title", description);
    
            if (Array.isArray(image)) {
                image.forEach((file: File) => {
                    (postData as FormData).append("image", file, file.name);  // Type assertion here
                });
            }
            postData.append('bedroomNumber', bedroom.toString());
            postData.append('bathroomNumber', bathroom.toString());
            postData.append('typeOfProperty', typeOfProperty);
            postData.append('furnished', furnished.toString());
            postData.append('parkingAvailable', parkingAvailable.toString());
            postData.append('rentType', rentType);
            //postData.append('dateListed', dateListed.toISOString());
            postData.append('dateAvailableForRent', dateAvailableForRent.toISOString());
            postData.append("city", city);
            postData.append("address", address);
            postData.append("province", province);
            postData.append("zipcode", zipcode);
            postData.append("price", price.toString());
            postData.append("country", country);
        } else {
            postData = {
                _id: id, 
                title: title, 
                description: description, 
                imagePath: image,  
                bedroom, 
                bathroom, 
                typeOfProperty, 
                furnished, 
                parkingAvailable, 
                rentType, 
                dateListed, 
                dateAvailableForRent,
                city: city, 
                address: address,
                province: province,
                zipcode: zipcode,
                country: country,
                price: price,
                creator: null  
            };
        }
this.http.put(BACKEND_URL + id, postData).subscribe(response =>{
// const updatedPosts = [...this.posts];
// const oldPostIndex = updatedPosts.findIndex(p => p._id === id)
// const post: post = {
//     _id:id, title: title, content: content, imagePath: ''
// }
// updatedPosts[oldPostIndex] = post;
// this.posts = updatedPosts;
this.router.navigate(["/"]); // redirecting the route
});
    }

    deletePost(postId: string) {
        return this.http.delete(BACKEND_URL + postId);
    }

    // searchPosts(city: string, bedroom?: number, bathroom?: number, furnished?: boolean, parkingAvailable?: boolean, minPrice?: number, maxPrice?: number): Observable<any> {
    //     let params = new HttpParams();
    //     if (city) params = params.append('city', city);
    //     if (bedroom) params = params.append('bedroom', bedroom.toString());
    //     if (bathroom) params = params.append('bathroom', bathroom.toString());
    //     if (furnished !== undefined) params = params.append('furnished', furnished.toString());
    //     if (parkingAvailable !== undefined) params = params.append('parkingAvailable', parkingAvailable.toString());
    //     //price is missing

    
    //     return this.http.get(`${BACKEND_URL}/search-posts`, { params });
    //   }

}
