# rznish — My Bookmark Manager

**Open-source · Self-hosted · No data collection — You have full control.**

## Getting Started

### 1. Clone the Repository

Clone the repository or download the repository as a ZIP file.

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then configure your `.env` file:

```env
# PostgreSQL connection string
# Recommended provider: Neon
DATABASE_URL=postgres://vault:vault@localhost:5432/bookmark_vault

# Random string, at least 32 characters
AUTH_SECRET=change-me-to-a-long-random-string-32-chars-min

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Set to "false" to disable public sign-up
# once your users have created their accounts
ALLOW_REGISTRATION=true
```

### 4. Set Up the Database

Run the database migration:

```bash
npm run db:migrate
```

Optionally, seed the database with sample bookmarks:

```bash
npm run db:seed
```

### 5. Run the Web App Locally

```bash
npm run dev
```
The application will be available at:

```text
http://localhost:3000
```

## Deployment

You can deploy the application using **Vercel** or **Netlify**.

The basic deployment process is:

1. Connect your GitHub repository.
2. Configure the required environment variables.
3. Deploy the application.

## Contribution

There is no formal contribution process at the moment.

You can modify the project and add features for your own needs. This is an **open-source, self-hosted project**, so you have full control over your data and deployment.

Don't forget to ⭐ **star the repository** if you find it useful.

## LLM Usage

You can use an LLM to help diagnose bugs or errors during development. 🙏✅

### Demo Login

```text
Email: demo@bookmarkvault.dev
Password: demo1234
```
