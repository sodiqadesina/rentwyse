# Rent-Wyse
A Modern Rental Marketplace for Ontario – Listings, Messaging, Viewings & Secure Exchanges.

Rent-Wyse is a full-stack rental marketplace designed to simplify property renting in Ontario.
It currently enables users to create rental listings, chat in real-time, schedule viewings, and exchange rental agreement documents for seamless landlord–tenant communication.

This monorepo contains both the Angular frontend and the Node.js/Express/MongoDB backend.
Each folder includes its own in-depth documentation — this root README gives the high-level architectural overview and conceptual flow of the entire system.

# 🚀 Features (High-Level)

  🔐 User Authentication & Email Verification
  
  🏠 Rental Listings with property details and image uploads
  
  💬 Real-Time Messaging (Socket.io) between landlords & renters
  
  📅 Viewing Date Scheduling per conversation
  
  📄 Agreement & Signed Document Exchange
  
  🔔 Live Notifications for new messages and document updates
  
  🌐 REST API + Angular SPA full-stack architecture
  
# 🏗️ System Architecture Overview

   Below is a concise visualization of the architecture integrating frontend, backend, and data layers.

1. High-Level System Architecture



2. Backend Module Architecture (Overview)



3. Frontend Architecture (Overview)



4. Application Workflow (End-to-End Lifecycle)


# Project Structure (Monorepo)

```
Rent-wyse/
│
├── rentwyse-frontend/      # Angular 16 SPA (User Interface)
│   └── README.md           # Detailed frontend documentation
│
├── rentwyse-backend/       # Node.js + Express + MongoDB API
│   └── README.md           # Detailed backend documentation
│
└── README.md               # (This file) Root system overview
```


# ⚙️ Technology Stack

  - Frontend
      - Angular 16
      
      - Angular Material
      
      - RxJS
      
      - Socket.io Client
      
      - Bootstrap (styling utilities)
    
  - Backend
  
      - Node.js / Express
      
      - Passport.js + JWT Authentication
      
      - Socket.io (real-time communication)
      
      - Multer (file uploads)
      
      - Mongoose / MongoDB
      
      - Nodemailer (email verification)
      
