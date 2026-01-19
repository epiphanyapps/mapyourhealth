# MapYourHealth Admin Portal

Admin portal for managing safety data, stat definitions, and hazard reports.

## Deployed URL

**Production:** https://main.d1810hifpx5957.amplifyapp.com

## Features

- **Dashboard** - Overview of system stats and recent activity
- **Stat Definitions** - Manage safety metrics (water, air, health, disaster)
- **Zip Code Data** - Add and edit safety stats for specific zip codes
- **Bulk Import** - Import stats data via CSV/JSON upload
- **Hazard Reports** - Review and moderate user-submitted reports

## Development

### Prerequisites

- Node.js 18+
- Yarn 4.x (via corepack)

### Getting Started

```bash
# From the monorepo root
yarn install

# Run development server
cd apps/admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Authentication

The admin portal requires authentication via AWS Cognito. Users must be in the `admin` group to access the portal.

## Deployment

The admin portal is deployed to AWS Amplify Hosting.

- **App ID:** d1810hifpx5957
- **Region:** us-east-1
- **Platform:** WEB_COMPUTE (Next.js SSR)

Build configuration is defined in the root `amplify.yml` file.

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework with App Router
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [AWS Amplify](https://docs.amplify.aws/) - Authentication and data
