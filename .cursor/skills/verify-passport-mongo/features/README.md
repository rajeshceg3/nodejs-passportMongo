# Feature map: nodejs-passportMongo

Purpose (from PRD.md + source interview): a reusable Express + MongoDB + EJS
starter with passport-local registration, login, sessions (stored in
MongoDB), flash feedback, protected pages and logout.

## Exercised by verify.cjs (real cookie jar, in-memory MongoDB)

| Flow | What is proven |
|---|---|
| Route protection | /, /about, /gallery, /contact redirect to /login unauthenticated |
| Pages | /login and /register render 200 (regression: login 500d on `messages is not defined`) |
| Register validation | mismatched passwords redirect back and show the flash; duplicate username redirects back and shows the flash (regression: register.ejs never rendered flash) |
| Register success | redirects to /login |
| Login failure | wrong password redirects to /login and shows the flash |
| Login success | redirects to /, home shows the logged-in username |
| Protected pages | /about, /gallery, /contact render 200 when authenticated |
| Logout | redirects, session ended, / redirects to /login again |

## Known boundaries (honest scope)

- Verification uses mongodb-memory-server: the users collection and session
  store are real MongoDB behavior, fully disposable. Never point MONGO_URL
  at a shared/cloud database for this.
- bcrypt hashing is exercised for real (register then login round-trip).
- Browser pixel checks are not part of this map; it proves HTTP behavior.
- REDIS_PORT in .env.example is unused by the app.
