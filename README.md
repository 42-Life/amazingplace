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
