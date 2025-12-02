import { Component, OnDestroy, OnInit } from '@angular/core';
import { post } from '../post.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PostsService } from '../posts.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { mimeType } from './mime-type.validator';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { CdkDragDrop, moveItemInArray, CdkDragStart } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-post-create',
  templateUrl: './post-create.component.html',
  styleUrls: ['./post-create.component.css']
})
export class PostCreateComponent implements OnInit, OnDestroy {
    enteredContent = ''
    enteredTitle = '';
    postId: any;
    post: any;
    isLoading = false; // for the spinner
    form: any;
    propertyTypes = ['Flat', 'Apartment', 'House', 'Town House'];
    rentTypes = ['Entire Apartment', 'Room with private washroom', 'Room with shared washroom', 'Room on sharing basis'];
    
    imagePreview: any[] = [];
    public mode = 'create';
    private authStatusSub!: Subscription;

    

    constructor(public postsService: PostsService, public route: ActivatedRoute, private authService: AuthService){}

    ngOnInit() {
        this.authStatusSub = this.authService.getAuthStatusListener().subscribe(authStatus =>{
            this.isLoading = false;
        })
        this.form = new FormGroup({
            title: new FormControl(null, {validators: [Validators.required, Validators.minLength(3)]}),
            description: new FormControl(null, {validators: [Validators.required]}),
            image: new FormControl(null, {validators: [Validators.required], asyncValidators: [mimeType]}),
            bedroom: new FormControl(null, {validators: [Validators.required]}),
            bathroom: new FormControl(null, {validators: [Validators.required]}),
            typeOfProperty: new FormControl(null, {validators: [Validators.required]}),
            furnished: new FormControl(false),
            parkingAvailable: new FormControl(false),
            rentType: new FormControl(null, {validators: [Validators.required]}),
            dateListed: new FormControl({value: null, disabled: this.mode === 'edit'}, Validators.required),
            dateAvailableForRent: new FormControl(null, {validators: [Validators.required]}),
            city: new FormControl(null, {validators: [Validators.required]}),
            address: new FormControl(null, {validators: [Validators.required]}),
            province: new FormControl(null, {validators: [Validators.required]}),
            zipcode: new FormControl(null, {validators: [Validators.required]}),
            country: new FormControl(null, {validators: [Validators.required]}),
            price: new FormControl(null, {validators: [Validators.required]}),
        });
            
        this.route.paramMap.subscribe((paramMap: ParamMap) =>{
            if(paramMap.has('postId')){
                this.mode = 'edit';
                this.postId = paramMap.get('postId');
                // this is where the loader starts 
                this.isLoading = true;
                //getting the post data from the backend 
                this.post = this.postsService.getPost(this.postId).subscribe(postData =>{
                    // this is where it stops loading 
                    this.isLoading = false;
                    this.post = { ...postData, id: postData._id };
                    //converting data to date type
                    const dateListed = new Date(postData.dateListed);
                    const dateAvailableForRent = new Date(postData.dateAvailableForRent);

                    //  hydrate imagePreview from backend
                    const existingImages = (postData as any).imagePath;
                    if (existingImages) {
                    this.imagePreview = Array.isArray(existingImages)
                        ? existingImages
                        : [existingImages];
                    } else {
                    this.imagePreview = [];
                    }

                    this.form.setValue({
                        title: this.post.title,
                        description: this.post.description,
                        image: this.post.imagePath,
                        // Set values for new fields
                        bedroom: this.post.bedroom,
                        bathroom: this.post.bathroom,
                        typeOfProperty: this.post.typeOfProperty,
                        furnished: this.post.furnished,
                        parkingAvailable: this.post.parkingAvailable,
                        rentType: this.post.rentType,
                        dateAvailableForRent: dateAvailableForRent,
                        dateListed: new Date(postData.dateListed),
                        // Other fields
                        city: this.post.city,
                        address: this.post.address,
                        province: this.post.province,
                        zipcode: this.post.zipcode,
                        price: this.post.price,
                        country: this.post.country,
                        });
                        // Disable the dateListed field
                        this.form.get('dateListed').disable();
                    })
            }else{
                this.mode = 'create';
                this.postId = null;

                this.form.get('dateListed').enable();
                this.form.get('dateListed').setValue(new Date());
            }
        });
    };
    
    drop(event: CdkDragDrop<string[]>): void {
        moveItemInArray(this.imagePreview, event.previousIndex, event.currentIndex);
      }
      
      removeImage(image: string): void {
        const index = this.imagePreview.indexOf(image);
        if (index >= 0) {
          this.imagePreview.splice(index, 1);
        }
      }

      




  onImagePicked(event: Event) {
    const fileList = (event.target as HTMLInputElement).files;
    if (fileList && fileList.length > 0) {
        this.form.patchValue({ image: fileList });
        this.form.get('image').updateValueAndValidity();
        this.imagePreview = [];

        Array.from(fileList).forEach((file) => {
            const reader = new FileReader();  // Create a new instance for each file

            reader.onload = () => {
                this.imagePreview.push(reader.result as string);
                reader.onload = null;  // Clear the onload to ensure no lingering references
            };

            reader.readAsDataURL(file);
        });
    }
}

   
    

    onAddPost(){

        if(this.form.invalid){
            return;
        }
        this.isLoading = true;
        const image: File[] = Array.from(this.form.get('image').value);

         // Parse price as a number
        const priceValue = parseFloat(this.form.value.price);


        if(this.mode == 'create'){
            this.postsService.addPost(
                 // Populate with form values
                this.form.value.title,
                this.form.value.description,
                image,   // Send the entire FileList object
                this.form.value.bedroom,
                this.form.value.bathroom,
                this.form.value.typeOfProperty,
                this.form.value.furnished,
                this.form.value.parkingAvailable,
                this.form.value.rentType,
                this.form.value.dateListed,
                this.form.value.dateAvailableForRent,
                // Other fields
                this.form.value.city,
                this.form.value.address,
                this.form.value.province,
                this.form.value.zipcode,
                this.form.value.price,
                this.form.value.country,
                 // This will be set in the backend
            );
        }else{
            this.postsService.updatePost(
                this.postId,
                this.form.value.title,
                this.form.value.description,
                image,   // Send the entire FileList object
                this.form.value.bedroom,
                this.form.value.bathroom,
                this.form.value.typeOfProperty,
                this.form.value.furnished,
                this.form.value.parkingAvailable,
                this.form.value.rentType,
                this.form.value.dateListed,
                this.form.value.dateAvailableForRent,
                // Other fields
                this.form.value.city,
                this.form.value.address,
                this.form.value.province,
                this.form.value.zipcode,
                this.form.value.price,
                this.form.value.country,
                null,
                )
        }
  
        var post: post = {
            title: this.form.value.title,
            _id: this.form.value._id, imagePath: [], creator: '',
            description: this.form.value.description,
            bedroom: this.form.value.bedroom,
            bathroom: this.form.value.bathroom,
            typeOfProperty: this.form.value.typeOfProperty,
            furnished: this.form.value.furnished,
            parkingAvailable: this.form.value.parkingAvailable,
            rentType: this.form.value.rentType,
            dateListed: this.form.value.dateListed,
            dateAvailableForRent: this.form.value.dateAvailableForRent,
            city: this.form.value.city,
            address: this.form.value.address,
            province: this.form.value.province,
            zipcode: this.form.value.zipcode,
            price: this.form.value.price,
            country: this.form.value.country,
        };

        console.log(post)

        this.form.reset();
    }


ngOnDestroy(){
    this.authStatusSub.unsubscribe();
}


}