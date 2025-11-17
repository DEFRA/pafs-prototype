# PAFS Prototype

Prototype for the **Project Application and Funding Service (PAFS)** built with the [GOV.UK Prototype Kit](https://github.com/alphagov/govuk-prototype-kit) and deployed on the Core Delivery Platform (CDP).

> This prototype is used for testing user journeys and gathering feedback. It is not a production application.

## Table of Contents

- [PAFS Prototype](#pafs-prototype)
  - [Table of Contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
    - [Node.js Installation](#nodejs-installation)
    - [Visual Studio Code](#visual-studio-code)
  - [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Environment Setup (.env)](#environment-setup-env)
    - [VS Code Launch Configuration](#vs-code-launch-configuration)
    - [Running Locally](#running-locally)
  - [Development](#development)
    - [Available Scripts](#available-scripts)
    - [Using Launch Configurations](#using-launch-configurations)
  - [Password Protection](#password-protection)
    - [Local Development](#local-development)
    - [CDP Environments](#cdp-environments)
  - [Environment Variables](#environment-variables)
  - [Deployment](#deployment)
  - [GOV.UK Resources](#govuk-resources)
  - [Licence](#licence)

## Prerequisites

### Node.js Installation

**Required Version:** Node.js `>= v22` and npm `>= v11`

**Option 1: Using Node Version Manager (Recommended)**

1. Install [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm):

   **Windows:**
   - Download and install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)

   **macOS/Linux:**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. Install Node.js v22:

   ```bash
   nvm install 22
   nvm use 22
   ```

3. Verify installation:
   ```bash
   node --version  # Should show v22.x.x
   npm --version   # Should show v11.x.x or higher
   ```

**Option 2: Direct Installation**

Download and install Node.js v22+ from [nodejs.org](https://nodejs.org/)

### Visual Studio Code

**Recommended IDE:** [Visual Studio Code](https://code.visualstudio.com/)

**Recommended Extensions:**

- **Prettier** - Code formatter
- **ESLint** - JavaScript linting
- **Nunjucks** - Template syntax highlighting

Install VS Code from [code.visualstudio.com](https://code.visualstudio.com/download)

## Getting Started

### Installation

1. **Clone the repository:**

   ```bash
   git clone git@github.com:DEFRA/pafs-prototype.git
   cd pafs-prototype
   ```

2. **Use the correct Node version (if using nvm):**

   ```bash
   nvm use
   ```

   This reads the version from `.nvmrc` file.

3. **Install dependencies:**
   ```bash
   npm install
   ```

### Environment Setup (.env)

The `.env` file contains environment variables for **local development only**.

> [!CAUTION]
> **NEVER commit the `.env` file to version control!** It's already in `.gitignore` to prevent accidental commits.

**Setup Steps:**

1. **Copy the template:**

   ```bash
   cp .env.template .env
   ```

2. **Edit `.env` file** (optional for local development):

   ```dotenv
   # Uncomment to enable password protection locally
   #PASSWORD=yourpassword

   # Uncomment for multiple passwords
   #PASSWORD_KEYS=password1,password2

   # Add your custom environment variables below
   ```

3. **What NOT to do:**
   - Don't commit `.env` to Git
   - Don't share `.env` files via email or chat
   - Don't store production secrets in `.env`

4. **What to do instead:**
   - Use `.env` only for local development
   - Use CDP Portal Secrets for production
   - Use launch.json for local configuration (recommended)

### VS Code Launch Configuration

**Recommended approach for running the prototype in VS Code.**

1. **Create `.vscode/launch.json`** in the project root:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Dev Server",
         "runtimeExecutable": "npm",
         "runtimeArgs": ["run", "dev"],
         "skipFiles": ["<node_internals>/**"],
         "console": "integratedTerminal",
         "env": {
           "NODE_ENV": "development"
         }
       }
     ]
   }
   ```

2. **Benefits of using launch.json:**
   - No need to create `.env` file
   - Can be committed to Git (no secrets)
   - Easy to switch between configurations
   - Integrated debugging in VS Code
   - Team members get the same setup

> [!NOTE]
> Local development doesn't require passwords since localhost is only accessible from your machine. Password protection is configured when deploying to CDP environments.

### Running Locally

**Option 1: Using VS Code (Recommended)**

1. Open the project in VS Code
2. Press `F5` or go to **Run and Debug** panel (Ctrl+Shift+D)
3. Select a configuration:
   - **Dev Server (No Password)** - Standard development
   - **Production Server** - Test production build
4. Click the green play button or press `F5`

**Option 2: Command Line**

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start

# Serve (production mode alternative)
npm run serve
```

The prototype will be available at **http://localhost:3000**

> [!WARNING]
> This is a prototype for testing user journeys only. It is **not production-ready** and should never be used for live services.

## Development

### Available Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start development server with hot reload |
| `npm run serve`        | Serve the prototype (production mode)    |
| `npm start`            | Start production server                  |
| `npm run format`       | Format code with Prettier                |
| `npm run format:check` | Check code formatting                    |

### Using Launch Configurations

**Recommended:** Use VS Code launch configurations instead of `.env` files.

**Available Configurations:**

1. **Dev Server (No Password)**
   - Standard local development
   - Hot reload enabled
   - No password required (localhost only)

2. **Production Server**
   - Simulates production environment
   - No hot reload
   - Tests production build locally

**To use:**

- Press `F5` in VS Code
- Or use Run and Debug panel (Ctrl+Shift+D)
- Select your desired configuration
- Click the green play button

## Password Protection

> [!IMPORTANT]
> Password protection is designed for **deployed/hosted environments** (CDP, Heroku, Railway, etc.), not for local development.

### Local Development

**For local development on your machine:**

- Password protection is **NOT required**
- Run with `npm run dev` - no password needed
- Your prototype runs on `localhost` which is only accessible from your computer

> [!NOTE]
> You don't need password protection locally because localhost is already private to your machine.

### CDP Environments

Basic authentication is **enabled by default** on CDP environments.

**Setting a Password:**

1. Go to [CDP Portal Frontend](https://portal.cdp-int.defra.cloud/)
2. Navigate to your service → **Secrets** tab
3. Add a secret:
   - Name: `PASSWORD`
   - Value: Your chosen password
4. Re-deploy the prototype

**Multiple Passwords:**

Add `PASSWORD_KEYS` secret as a comma-separated list in CDP Portal Secrets tab. See [GOV.UK Prototype Kit docs](https://prototype-kit.service.gov.uk/docs/publishing) for details.

**Disable Authentication:**

Add `USE_AUTH=false` as a secret in CDP Portal Secrets tab.

## Environment Variables

**For Local Development:**

- Use `launch.json` (recommended) or `.env` file

**For CDP Environments:**

- **All secrets** (both sensitive and non-sensitive) go to **CDP Portal → Secrets tab**

**Available Variables:**

| Variable        | Description                                 | Example                       |
| --------------- | ------------------------------------------- | ----------------------------- |
| `PASSWORD`      | Basic authentication password               | `mySecurePassword123`         |
| `PASSWORD_KEYS` | Comma-separated list for multiple passwords | `password1,password2`         |
| `USE_AUTH`      | Set to `false` to disable authentication    | `false`                       |
| `PORT`          | Server port (default: 3000)                 | `3000`                        |
| `NODE_ENV`      | Environment mode                            | `development` or `production` |

## Deployment

Deployment to CDP environments is automated. Docker images are built and deployed via the CDP Portal.

**Manual Docker Build (Optional):**

```bash
# Development
docker build --target development --tag pafs-prototype:dev .
docker run -e PORT=3000 -p 3000:3000 pafs-prototype:dev

# Production
docker build --tag pafs-prototype .
docker run -e PASSWORD=yourpassword -e PORT=3000 -p 3000:3000 pafs-prototype
```

**Debug Container:**

```bash
docker build --tag pafs-prototype .
docker run -it --entrypoint /bin/ash pafs-prototype
```

## GOV.UK Resources

- [GOV.UK Prototype Kit Documentation](https://prototype-kit.service.gov.uk/docs/)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [GOV.UK Frontend](https://github.com/alphagov/govuk-frontend)
- [CDP Documentation](https://github.com/DEFRA/cdp-documentation)

## Licence

This project is licensed under the [Open Government Licence v3.0](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3) and MIT License (see [LICENSES](./LICENSES/) directory).

**Attribution:**

> Contains public sector information licensed under the Open Government Licence v3.0
