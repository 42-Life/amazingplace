# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Database (Supabase)

### How it works

- The app's data lives in a **hosted Supabase project**, which is a Postgres database plus login (auth) and file storage.
- The repo keeps the database structure in two forms:

| Folder | What it is | Do you edit it? |
|---|---|---|
| `supabase/schema/` | What the database **should look like right now**: tables, constraints, policies, functions, triggers. One file per table, plus `functions.sql` and `auth.sql`. | **Yes**, this is where you make changes. |
| `supabase/migrations/` | The **history of changes**, as SQL files that run in order. The hosted database remembers which ones it has already run. | No, these are generated. |

The flow is: edit `schema/` → the CLI writes a migration → you push the migration to the hosted database.

### One-time setup

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) (v3 or newer) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Log in and link the repo to the hosted project:

   ```bash
   supabase login
   supabase link --project-ref xtrhhafbmiygsurnxobg
   ```

   `link` asks for the **database password**. That's not your Supabase account password. Ask a teammate, or reset it in the dashboard under Project Settings → Database.

### Making a change

1. **Pull first** (`git pull`), so you're working from the latest migrations.
2. **Edit the SQL** in `supabase/schema/`. Example: to make a column required, change `latitude double precision,` to `latitude double precision not null,`.
3. **Generate a migration** (Docker must be running):

   ```bash
   supabase db schema declarative sync --name short_description_of_change
   ```

   This compares `schema/` to `migrations/` and writes the difference to a new file in `supabase/migrations/`.
4. **Read the new migration.** The tool guesses. A renamed column, for example, can come out as "drop column + add column", which deletes that column's data. Fix the SQL by hand if needed.
5. **Push it to the hosted database:**

   ```bash
   supabase db push --remote
   ```

   This only runs migrations the hosted database hasn't run yet.
6. **Commit** the `schema/` change and the new migration together.

### Rules

- **Don't change the schema in the Supabase dashboard.** The repo won't know about it. If it happens anyway, run `supabase db pull --remote` to bring it into `migrations/`, then update `schema/` to match.
- **Don't edit a migration after it's been pushed.** Fix mistakes with a new migrations.
- **Check existing data before adding rules.** For example, making a column `not null` fails if any row already has an empty value in that column. Fix or delete those rows first.
- **Changing data** (insert/update/delete rows) doesn't belong in `schema/`. Run `supabase migration new <name>`, write the SQL in the new file, and push it. Or directly change the data in the Supabase console.
- **CLI v3 uses a local database by default.** Add `--remote` to `db push` and `db pull` to target the hosted project.

## Challenge management

The Managing view lists challenges owned by the signed-in account. New challenges record `creator_account_id`; challenges created before this field was added have no recorded owner and need an explicit owner assignment in the database before they appear here. Do not infer ownership from photo submissions.

Editing rules are checked in `src/lib/challenges.ts` and by a database trigger. The database uses its current calendar date when enforcing start and end date restrictions.

Run the edit validation tests with `npm test`. The permission checks in `tests/challenge-management.sql` are for a disposable database with the project schema applied; they create test accounts and roll back all changes.

## Preview photos

A challenge can carry one optional preview photo, picked from the creator's photo library on
step 1 of the New Challenge form. It's what the card on the map shows when someone taps the pin,
so people can see the spot before opening the challenge. A challenge without one looks exactly
as it did before.

- The photo goes in the **`challenge-previews`** storage bucket, under `<auth user id>/`, which is
  the only folder the storage policies let a user write to. The challenge row keeps its path in
  `challenges.preview_path` (null means no preview).
- It's uploaded in `createChallenge`, after every other check has passed, so a form that gets
  rejected never leaves a photo behind. If the insert then fails, the file is deleted.
- The bucket takes JPEG, PNG and WebP up to 5 MiB. The picker opens with `allowsEditing`, and the
  editor hands back a JPEG — that's what keeps an iPhone's HEIC originals, which the bucket would
  refuse, from ever being picked. `getPreviewFile` in `src/utils/media.ts` checks the format
  anyway, before the file is read.
- A preview is **not** a submission: nothing checks where it was taken, and it never appears in
  the entries grid. That's why it lives in `src/lib/challenge-previews.ts` rather than in
  `src/lib/photos.ts`.

Previews can't be changed after creation yet — the Managing view doesn't offer it. Nothing in the
database stops it (`preview_path` isn't one of the frozen columns in `validate_challenge_edit`),
so adding it is an edit-form change, not a migration.

## Paid challenges (Stripe)

A challenge can have an entry fee. Free challenges (`price_cents = 0`) work exactly as before
and never touch Stripe.

### How it works

1. The creator sets a fee in the New Challenge form. It's stored in `challenges.price_cents`
   as whole cents, and can't be changed afterwards (a database trigger refuses it).
2. On a paid challenge, the button on the challenge screen reads "Pay $5.00 to enter".
   Tapping it calls the `create-entry-payment` edge function, which creates a Stripe
   PaymentIntent and opens Stripe's payment sheet. It refuses unless the challenge is in
   its entry phase, so nobody is charged for a challenge they can't submit to yet.
3. When the payment succeeds, Stripe calls the `stripe-webhook` edge function, which marks
   that person's row in `challenge_entries` as `paid`. **Only the webhook does this** — the
   app can't, which is why a user can't grant themselves entry.
4. The `submissions` insert policy calls `has_challenge_access()`, so an unpaid submission is
   refused by the database even if someone gets past the app's buttons.

Two rules hold this together, and both are worth keeping:

- **The amount comes from the database, never from the app.** The app sends a challenge id and
  nothing else, so a tampered request can't buy a $20 challenge for 50¢.
- **One definition of "now".** The edge function calls `challenge_phase()` rather than working
  the date out itself. It's the same function the `submissions` insert policy uses, so paying
  and submitting can't disagree — including about time zones, since the database counts days
  in America/New_York while a date built in an edge function would be UTC.

- **The secret key lives only in the edge functions.** The app holds the publishable key
  (`pk_`), which can start payments and nothing else. If you ever find an `sk_` or `rk_` key
  under `src/`, it's in the wrong place — roll it in the Stripe dashboard.

### One-time setup

1. Get test API keys. With no Stripe account, [the Stripe CLI](https://docs.stripe.com/cli)
   can make a throwaway one:

   ```bash
   npm i -g @stripe/cli
   stripe sandbox create     # or `stripe login` for an existing account
   ```

2. Put the publishable key in `.env.local` next to the Supabase ones:

   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

   Without it the app still runs; only paid challenges stop, with a message saying so.

3. Give the edge functions the secret key. These are set on the hosted project, not committed:

   ```bash
   supabase secrets set STRIPE_SECRET_KEY=rk_test_...
   supabase functions deploy create-entry-payment
   supabase functions deploy stripe-webhook
   ```

   Prefer a [restricted key](https://docs.stripe.com/keys#manage-your-api-keys) (`rk_`) with
   write access to Customers, Customer Sessions and PaymentIntents over a full `sk_` key.

4. Point Stripe at the webhook. In the Stripe dashboard add an endpoint for
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, subscribed to
   `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` and
   `charge.dispute.closed`. Then store its signing secret:

   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Testing

The Stripe SDK has native code, so **Expo Go can't open the payment sheet**. Use a development
build (`npx expo run:ios`, or `eas build --profile development`).

Forward webhooks to a local function with `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`
(use the `whsec_` it prints, not the dashboard's). Pay with card `4242 4242 4242 4242`, any
future expiry and any CVC; `4000 0025 0000 3155` forces a 3D Secure prompt and
`4000 0000 0000 9995` is declined. The full list is in
[Stripe's testing docs](https://docs.stripe.com/testing).

No real money moves while the keys are test keys. Switch to live keys only when the team
decides to, and never commit either kind.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
