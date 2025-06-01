# Node.js Starter Application

This project is a Node.js web application featuring user authentication (login, registration) and several basic protected pages. It's built with Express.js, uses MongoDB for data storage (via `connect-mongodb-session` for sessions and `mongodb` driver for user data), EJS for templating, and Passport.js (with `passport-local`) for authentication.

## Purpose

This application can serve multiple purposes:

*   **Foundational Template:** Use it as a starting point for building more complex web applications that require a user authentication system.
*   **Educational Tool:** Ideal for learning and understanding core concepts in Node.js web development, including:
    *   Setting up an Express server.
    *   Routing.
    *   Middleware usage.
    *   Templating with EJS.
    *   MongoDB integration.
    *   Session management.
    *   User authentication with Passport.js.
    *   Environment variable management.

## Features

*   User registration (username and password)
*   User login and logout
*   Password hashing using bcrypt
*   Session management persisted in MongoDB
*   Protected routes (Home, About, Gallery, Contact) accessible only after login
*   Basic error handling and user feedback

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** A recent LTS version is recommended (e.g., v16, v18, or v20). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** Node Package Manager, which usually comes bundled with Node.js.
*   **MongoDB:** A running MongoDB instance. This can be a local installation or a cloud-hosted service like MongoDB Atlas.

## Getting Started

Follow these steps to get the application up and running:

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd <repository-directory-name>
    ```

2.  **Install Dependencies:**
    Install the project dependencies using npm:
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables:**
    The application uses environment variables for configuration, primarily for the database connection and session secret.
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Open the `.env` file and update the following variables:
        *   `MONGO_URL`: Your MongoDB connection string.
            *   For a local MongoDB instance, it might look like: `mongodb://localhost:27017/node_starter_db` (replace `node_starter_db` with your preferred database name).
            *   For MongoDB Atlas, use the connection string provided by Atlas.
        *   `SECRET`: A long, random, and strong string used to encrypt session data. You can generate one using a password manager or an online generator.

4.  **Run the Application:**
    Start the server using the npm script:
    ```bash
    npm start
    ```
    By default, the application will run on `http://localhost:3000`. You should see console messages indicating that the server is listening and successfully connected to MongoDB.

5.  **Access the Application:**
    Open your web browser and navigate to `http://localhost:3000`. You will be redirected to the login page. You can register a new user and then log in to access the protected pages.

## Project Structure (Brief Overview)

*   `index.js`: The main entry point of the application. Contains server setup, middleware configuration, route definitions, and database connection logic.
*   `package.json`: Lists project dependencies and npm scripts.
*   `.env.example`: Template for environment variables.
*   `views/`: Contains EJS template files.
    *   `partials/`: Reusable EJS partials (e.g., header, head).
*   `public/` (if you add static assets like CSS/JS): Would contain static files.

## Available Pages

*   `/login`: User login page.
*   `/register`: User registration page.
*   `/`: Home page (protected).
*   `/about`: About page (protected).
*   `/gallery`: Gallery page (protected).
*   `/contact`: Contact page (protected).
*   `/logout`: Logs the user out and redirects to login.

## Contributing

Contributions are welcome! If you have suggestions for improvements or find any bugs, please open an issue or submit a pull request.

(Further sections like "Bug Reporting", "CI/CD" can be expanded as those features are implemented.)

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration. A workflow is set up to automatically:

*   Install dependencies.
*   Lint the JavaScript code using ESLint.

This happens on every push to the `main` branch and on every pull request targeting `main`. This helps ensure code quality and consistency.

(Future enhancements could include adding automated tests and a deployment (CD) stage.)
