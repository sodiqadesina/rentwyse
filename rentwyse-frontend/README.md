# Rent-Wyse Frontend (Angular 17)

Modern Single-Page Application for a full-stack rental marketplace.

## 📌 Overview
Rent-Wyse Frontend is a feature-rich Angular SPA that powers the user interface of the Rent-Wyse rental marketplace.

It provides:

- Property browsing & filtering

- Listing creation & management

- Real-time messaging between tenants & landlords

- JWT authentication system

- WebSocket notifications

- File uploads (images & documents)

- Dialog-driven interactions (inquiries, confirmations, edits)

This frontend communicates with:

- Node.js/Express REST API (HTTP + JSON)

- Socket.io server (WebSockets)

- MongoDB (via backend)


# 🛠️ Technology Stack
| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| UI Framework | **Angular 17 (SPA)**                      |
| Styling      | Angular Material, Flex Layout, Custom CSS |
| State        | RxJS, Subjects/BehaviorSubjects           |
| Messaging    | Socket.io-client                          |
| HTTP         | Angular HttpClient + JWT AuthInterceptor  |
| Dialogs      | Angular Material Dialog                   |
| Forms        | Reactive Forms                            |
| Routing      | Angular Router                            |

# Project Structure 
```
src/app/
│
├── auth/
│   ├── login/
│   ├── signup/
│   ├── settings/
│   ├── auth.service.ts
│   ├── auth-interceptor.ts
│   ├── auth-guard.ts
│
├── posts/
│   ├── post-list/
│   ├── post-create/
│   ├── user-post-list/
│   ├── posts.service.ts
│
├── messaging/
│   ├── messages/
│   ├── inquiry-dialog/
│   ├── delete-confirmation/
│   ├── messaging.service.ts
│
├── notification/
│   ├── notification.component.ts
│   ├── notification.service.ts
│   ├── socket.service.ts
│
├── header/
├── footer/
├── home/
├── error/
├── loading/
└── app.component.ts
```
# ⚙️ Frontend Architecture

The Angular application is structured using feature-based modules, core services, and cross-cutting infrastructure (interceptors, guards, sockets).

 ![Architecture](images/componentarchitecture.png)

🧩 Frontend Component Rendering & Routing Flow 

This sequence diagram illustrates the initial application rendering flow and how routing determines which feature module is loaded in the Rent-Wyse Angular frontend.

1. AppComponent bootstraps the entire application, acting as the root shell.

2. It immediately triggers the rendering of shared layout components:

  - HeaderComponent
  
  - FooterComponent
  
  - HomeComponent (default landing view)
  
  - NotificationComponent (for real-time socket alerts)
  
  - ErrorComponent (for global error handling)

3. When a user interacts with the UI (for example clicking a button or selecting a menu item), the HomeComponent instructs the application to navigate using the Router.

4. The RouterOutlet receives the navigation request and determines which module to load:

  - Navigating to /auth/... loads the lazy-loaded AuthModule
  
  - Navigating to /list, /create, /edit/:id, /my-listing loads the PostsModule
  
  - Navigating to /message or /messages/:id loads the MessagingModule

5. Each route triggers the appropriate feature module and its components to render inside the RouterOutlet, while the AppComponent layout (header, footer, notification, etc.) remains persistent.


# 🔐 Authentication Flow

  Components & services:
  
  - AuthService
  
  - AuthInterceptor
  
  - AuthGuard
  
  - LoginComponent, SignupComponent
  
  - ErrorInterceptor
  
  
# 🏘️ Post / Listing Feature Architecture

  Key files:
  
  - posts.service.ts
  
  - post-list.component.ts
  
  - post-create.component.ts
  
  - user-post-list.component.ts
  

