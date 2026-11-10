---
name: verify-passport-mongo
description: "Verify nodejs-passportMongo's register/login/session/logout surface with an isolated in-memory MongoDB, a real cookie jar and recorded evidence. Use before reporting behavior changes complete."
---

# Verify nodejs-passportMongo

Generated from source interview following pstack create-verification-skill. Read features/README.md first.

## Launch

From the repository root run `npm install --ignore-scripts && npm rebuild bcrypt`, then
`node .cursor/skills/verify-passport-mongo/verify.cjs`. Node 18+ required
(developed on Node 22). The app hardcodes port 3000; the helper refuses to
start if that port is taken. mongodb-memory-server downloads a local mongod
binary on first run; if its cache is truncated, extract a complete official
download to a scratch path and set MONGOMS_SYSTEM_BINARY. Never set
MONGO_URL to a shared or cloud database.

## Doctor

The helper confirms its own child is alive and GET /login returns 200 before
driving. A TCP listener alone is not success. After a surprising failure,
clean up and rerun from a fresh instance.

## Drive

Run `node .cursor/skills/verify-passport-mongo/verify.cjs`. It keeps a real
cookie jar and exercises registration (mismatch, success, duplicate), login
(wrong and correct password), the protected pages, flash feedback and
logout. All traffic is what a real browser form sends; no internal setters
or test-only endpoints.

## Evidence

Default location is a unique /tmp/verify-passport-mongo- directory, printed
at exit. Set VERIFY_EVIDENCE_DIR to a new private persistent path to retain
proof. evidence.json records each action, response/status, assertions,
findings and cleanup; server.log captures the child output. One passing
path never means the whole map passed; check FAILURES=0.

## Cleanup

The helper signals only the processes it created (app child, in-memory
mongod), escalates only on its own children and preserves evidence. Confirm
cleaned:true. All database state is disposable.

## Helpers

`node .cursor/skills/verify-passport-mongo/verify.cjs` is self-contained
(stdlib plus the repo's devDependency mongodb-memory-server). A dependency
or mongod binary failure is a blocker, not a skipped pass.

## Maintenance

After behavior changes use /maintain-verification-skill: reconcile every
mapped feature with source and exercise each live; report unreachable
prerequisites and product regressions rather than editing the map to hide
them.
