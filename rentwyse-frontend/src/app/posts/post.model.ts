export interface post {
   _id: string;
   title: string;
   description: string; // Changed from content to description
   imagePath: any[];
   creator: any;
   bedroom: number; // New field
   bathroom: number; // New field
   typeOfProperty: string; // New field
   furnished: boolean; // New field
   parkingAvailable: boolean; // New field
   rentType: string; // New field
   dateListed: Date; // New field
   dateAvailableForRent: Date; // New field
   city: string;
   address: string;
   province: string;
   zipcode: string;
   price: number;
   country: string;
   featured?: boolean;
   status?: 'draft' | 'active' | 'flagged' | 'deleted';
   isDeleted?: boolean;
 }
 