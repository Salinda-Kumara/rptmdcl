# Security Technologies in ERMAS Project

The **Examination Repeat & Medical Application Management System (ERMAS)** employs a robust, multi-layered security approach to prevent hacking, unauthorized access, and data breaches. Below is a breakdown of the specific technologies and practices used in this project across both the backend (NestJS) and frontend (Next.js).

## 1. Authentication and Authorization

*   **Argon2 (`argon2`):** A highly secure, modern password hashing algorithm used to hash user passwords before storing them in the database. Argon2 is designed to resist GPU-based cracking and side-channel attacks, offering superior security compared to older algorithms like bcrypt or PBKDF2.
*   **JSON Web Tokens (JWT) (`@nestjs/jwt`, `passport-jwt`):** Used for stateless, secure user authentication. After a successful login, the server issues a JWT, which is then used to securely identify and authorize the user for subsequent requests to protected API endpoints.
*   **Passport.js (`@nestjs/passport`, `passport`):** A comprehensive authentication middleware used in the NestJS backend to handle the JWT authentication strategy securely.

## 2. Network and Request Security

*   **Helmet (`helmet`):** A middleware used in the API backend to automatically set various secure HTTP headers (e.g., `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`). This protects the application from well-known web vulnerabilities such as Cross-Site Scripting (XSS) and Clickjacking.
*   **Rate Limiting (`@nestjs/throttler`):** Implemented globally in the `AppModule` to restrict the number of requests a single client (IP address) can make to the API within a specific timeframe (configured to 100 requests per 60 seconds). This mitigates brute-force attacks, credential stuffing, and Denial-of-Service (DoS) attempts.
*   **Cross-Origin Resource Sharing (CORS):** Explicitly configured in `main.ts` to restrict which external domains (origins) are allowed to interact with the API. This prevents malicious websites from making unauthorized cross-site requests on behalf of a user.

## 3. Data Validation and Input Protection

*   **Class Validator & Class Transformer (`class-validator`, `class-transformer`):** Used extensively in the backend alongside NestJS's global `ValidationPipe`. They ensure that all incoming request payloads strictly adhere to expected Data Transfer Object (DTO) schemas.
    *   **Protection against Mass Assignment:** The global validation pipe is configured with `whitelist: true` and `forbidNonWhitelisted: true`. This means any unexpected or malicious fields sent by a hacker in a request payload are automatically stripped and rejected, preventing "over-posting" vulnerabilities.
*   **Zod (`zod`):** A TypeScript-first schema declaration and validation library used in the Next.js frontend (alongside React Hook Form). It ensures that user inputs are rigorously validated on the client side before being transmitted to the server, catching malicious inputs early.

## 4. Database Security

*   **Prisma ORM (`@prisma/client`):** Used to interact with the PostgreSQL database. Prisma natively uses parameterized queries and prepared statements for all database operations. This fundamentally prevents **SQL Injection (SQLi)** attacks, as user input is never directly concatenated into SQL strings.

## 5. Frontend Security & Session Management

*   **React's Built-in XSS Protection:** The frontend is built using React (via Next.js), which automatically escapes variables embedded in JSX before rendering them to the DOM. This provides a strong baseline defense against Cross-Site Scripting (XSS) attacks.
*   **Cookie Management (`js-cookie`):** Utilized on the frontend for managing session states and authentication tokens securely across the application.

---

By combining these technologies—Argon2 for passwords, JWT for sessions, Helmet/CORS for network defense, Throttler for rate limiting, and strict DTO/Zod validation for inputs—the ERMAS project maintains a strong security posture against the OWASP Top 10 web application vulnerabilities.
