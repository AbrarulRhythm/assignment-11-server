# ASSIGNMENT-011 (eTuitionBd Server)

### 🌐 eTuitionBd Server | Backend API
This is the backend server for the eTuitionBd platform. It handles the business logic, secure database interactions with MongoDB, user authentication via JWT, and payment processing through Stripe integration.

### 🛠 Tech Stack & Packages
- **Node.js:** For building a scalable and fast server-side environment.
- **Express.js:** For creating a robust API and handling routing efficiently.
- **MongoDB:** For flexible and scalable NoSQL data storage.
- **JSON Web Token (JWT):** For secure, role-based access control and token verification.
- **Stripe:** For handling server-side payment intents and secure transactions.
- **Dotenv:** For managing sensitive environment variables and credentials.
- **Cors:** For enabling secure cross-origin resource sharing between client and server.

### 🔑 Key Server Features
- **Role-Based Access Control (RBAC):** Middleware to verify if a user is an Admin, Tutor, or Student before granting access to specific endpoints.
- **Secure Payment Flow:** Server-side implementation of Stripe API to process tuition fees.
- **Data Integrity:** Validation of tuition posts and tutor applications before saving to MongoDB.
- **JWT Verification:** Custom middleware to protect private routes and prevent unauthorized API calls.

## 🔗 Client Repository
The frontend for eTuitionBd is available here:  
[eTuitionBd Client Repo](https://github.com/AbrarulRhythm/assignment-11-client)

---

## 🚀 Setup
1. Clone the repository:
   ```bash
    https://github.com/AbrarulRhythm/assignment-11-server
   