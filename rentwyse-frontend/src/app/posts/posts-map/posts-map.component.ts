import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { post } from '../post.model';

interface RentalMarker {
  position: google.maps.LatLngLiteral;
  label?: google.maps.MarkerLabel;
  options?: google.maps.MarkerOptions;
  postId: string;
}

@Component({
  selector: 'app-posts-map',
  templateUrl: './posts-map.component.html',
  styleUrls: ['./posts-map.component.css'],
})
export class PostsMapComponent implements OnChanges {
  @Input() posts: post[] = [];
  /**
   * Address / city string from the search bar.
   * When this changes, we recenter the map around it.
   */
  @Input() searchAddress: string | null = null;

  /** Emit postId when a marker is clicked */
  @Output() markerClick = new EventEmitter<string>();

  // Default center: Waterloo-ish
  center: google.maps.LatLngLiteral = { lat: 43.4643, lng: -80.5204 };
  zoom = 11;

  markers: RentalMarker[] = [];

  // Basic map options
  options: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
  };

  private geocoder: google.maps.Geocoder | null = null;

  constructor() {
    // Geocoder is available once the Google Maps script is loaded
    if ((window as any).google && (window as any).google.maps) {
      this.geocoder = new google.maps.Geocoder();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Whenever posts change → rebuild markers
    if (changes['posts']) {
      this.buildMarkersFromPosts();
    }

    // Whenever searchAddress changes → geocode and recenter
    if (changes['searchAddress'] && this.searchAddress) {
      this.geocodeSearchAddress(this.searchAddress);
    }
  }

  private buildMarkersFromPosts(): void {
    this.markers = (this.posts || [])
      .filter((p: any) => !!p.location && p.location.lat && p.location.lng)
      .map((p: any) => {
        const priceText = p.price != null ? `$${p.price}` : '';
        return {
          position: {
            lat: p.location.lat,
            lng: p.location.lng,
          },
          label: priceText
            ? {
                text: priceText,
                className: 'map-marker-label',
              }
            : undefined,
          options: {
            clickable: true,
          },
          postId: p._id,
        } as RentalMarker;
      });

    // If we have at least one marker, center on the first
    if (this.markers.length > 0) {
      this.center = this.markers[0].position;
      this.zoom = 12;
    }
  }

  private geocodeSearchAddress(address: string): void {
    if (!address || !this.geocoder) {
      return;
    }

    this.geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location;
        this.center = { lat: loc.lat(), lng: loc.lng() };
        this.zoom = 13;
      } else {
        console.warn('[PostsMapComponent] Geocode failed:', status);
      }
    });
  }

  onMarkerClicked(marker: RentalMarker): void {
    this.markerClick.emit(marker.postId);
  }
}
