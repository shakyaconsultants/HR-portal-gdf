# MongoDB setup (required for login)

Login fails until `.env.local` has a **real** MongoDB Atlas connection string.

## Steps

1. Open [MongoDB Atlas](https://cloud.mongodb.com/) and sign in.
2. Create a free cluster (if you do not have one).
3. Go to **Database Access** → create a database user (username + password).
4. Go to **Network Access** → add your IP (or `0.0.0.0/0` for testing only).
5. Go to **Database** → **Connect** → **Drivers** → copy the Node.js `mongodb+srv://...` URI.
6. Paste it into `trainee-portal/.env.local`:

```env
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=trainee_portal
JWT_SECRET=any_long_random_string_at_least_32_chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

7. Replace `YOUR_USER`, `YOUR_PASSWORD`, and the cluster host (`YOUR_CLUSTER.xxxxx.mongodb.net`).
8. **Stop** the dev server (`Ctrl+C`) and run again:

```bash
npm run dev
```

9. Create your first users (see `.env.example` for `SEED_*` variables):

```bash
npm run seed:users
```

10. Open `http://localhost:3000` and sign in with the account you seeded.

## Your current error

`querySrv ENOTFOUND _mongodb._tcp.cluster0.mongodb.net` means the URI still points to the **demo host** `cluster0.mongodb.net`, not your real Atlas cluster.
