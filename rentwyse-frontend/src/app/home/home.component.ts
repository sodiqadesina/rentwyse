import { Component, OnInit } from '@angular/core';
import { PostsService } from '../posts/posts.service';
import { Router } from '@angular/router';

declare var google: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private postsService: PostsService, private router: Router) {}


  ngOnInit() {
    this.initAutocomplete();
  }




  //Google map places auto-complete

  private initAutocomplete(): void {
    // Initialize Google Places Autocomplete
    const autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('autocomplete') as HTMLInputElement,
      { types: ['geocode'] } // You can adjust types as per your requirement
    );

    // Add listener to handle place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and pressed the Enter key.
        return;
      }

      // Extracting the city from the selected place and use it for your search
      const city = this.extractCity(place);
      this.searchPostsByCity(city);
    });
  }

  private extractCity(place: google.maps.places.PlaceResult): string {
    // Logic to extract the city from the place object
    // This  involves iterating through the address components
    // and finding the one with the type 'locality' or a similar type
    let city = '';
    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes('locality')) {
          city = component.long_name;
          break;
        }
      }
    }
    return city;
  }

  private searchPostsByCity(city: string): void {
    // Make a request to your backend with the city as a parameter
    // You can use Angular services to make HTTP requests
    console.log('Selected City:', city);
    // TODO: Implement the logic to search for posts by city
    this.onCitySelected(city)
  }



  onSearch(city: string) {
    // Call the service method with the search parameters
    this.onCitySelected(city)
  }


  onCitySelected(city: string): void {
    console.log('Selected City:', city);
    this.router.navigate(['/list'], { queryParams: { city: city } });
  }












}