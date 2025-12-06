# Rent-Wyse Backend (Node.js + Express + MongoDB + Socket.io)

The Rent-Wyse Backend powers the full-stack rental marketplace enabling secure messaging, real-time communication, listing management, document exchange, and landlord–tenant deal flow.
This service exposes a REST API, WebSocket server, file upload pipeline, authentication system, and email verification engine.

# ⭐ Features

  🔐 Authentication & Users
  
  - JWT authentication (Passport JWT)
  
  - Password hashing (bcrypt)
  
  - Email verification via Google OAuth2 + Nodemailer
  
  - Profile retrieval & update
  
  - Change password workflow
  
  🏠 Listings / Posts
  
  - Create, update, delete, and search rental listings
  
  - Image upload with Multer → /images/
  
  - Soft-delete mechanism
  
  💬 Real-time Messaging
  
  - One-to-one conversations linked to listings
  
  - Offline message queueing
  
  - Read receipts & unread message tracking
  
  - Socket.io server integrated with Express
  
  📄 Agreements & Document Handling
  
  - Upload agreement files
  
  - Upload signed agreement files
  
  - Delete documents
  
  - Secure document viewing endpoints
  
  - File storage → /documents/
  
  📅 Viewing Dates
  
  - Landlords can set viewing dates for tenants
  
  - Automatic real-time notification via Socket.io
  
  
  🚧🚧 more features coming 🚧🚧
        /!\ 
       /___\   UNDER CONSTRUCTION
      (_____)

# 🧱 Tech Stack
  | Layer     | Technology                 |
  | --------- | -------------------------- |
  | Runtime   | Node.js                    |
  | Framework | Express                    |
  | Real-time | Socket.io                  |
  | Database  | MongoDB + Mongoose         |
  | Auth      | Passport Local + JWT       |
  | Email     | Nodemailer + Google OAuth2 |
  | Uploads   | Multer                     |
  | Security  | bcrypt, JWT                |
  | Env       | dotenv                     |

      
# 📂 Project Structure 
```
rentwyse-backend/
│── server.js                 # Entry point (HTTP + Socket.io)
│── app.js                    # Express configuration
│── socket.js                 # Realtime server logic
│── .env                      # Environment variables
│
├── config/
│   ├── passport-config.js    # Local & JWT strategies
│   ├── bcrypt-config.js      # Password hashing helpers
│   └── papalConfig.js        # PayPal config (future)
│
├── controllers/
│   ├── userController.js
│   ├── PostsController.js
│   ├── messageController.js
│   ├── conversationController.js
│   └── KycController.js
│
├── middleware/
│   ├── check-auth.js         # JWT middleware
│   ├── file.js               # Image upload
│   └── documents.js          # Agreements upload
│
├── models/
│   ├── user.js
│   ├── post.js
│   ├── conversation.js
│   └── message.js
│
├── routes/
│   ├── user.js
│   ├── posts.js
│   ├── conversations.js
│   ├── messages.js
│   └── kyc.js
│
├── images/                   # Uploaded listing images
└── documents/                # Uploaded agreements
```


![system architecture diagram](images/system-architecture-diagram-backend.png)


![data model diagram](images/datamodel.png)
























# rentwyse 🚧 👷 🔨 🛠️ 🔧🚧 UNDER CONSTRUCTION 🚧🔧

- Note that i have connected an online database so you have some data to work with

- Also you will need to put in an active email to confirm your account and you need internet connection running the backend because of the email service..

- I have restructured the files so the front end can make API calls

- I separated the port config into server.js and all other config about headers and route importation into the app.js file and connected them

- I added the route files and further broke down the app into routes and connected to the app.js file

- Also i added the middleware file and two middlewares check-auth and files middle-wares to handle route protection and to upload file from a create post call respectively

- added an images file to store images received form the newPost in the posts controller file

- still using bycrpt but passport.js isn't required anymore


  /!\ 
 /___\   UNDER CONSTRUCTION
(_____)

⚠️
🚧
🦺
