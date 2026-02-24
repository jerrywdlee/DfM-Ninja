# DfM-Ninja

DfM-Ninja is a premium, frontend-only SPA (Single Page Application) designed to assist Dynamics 365 customer support engineers. It provides a clean, fast, and feature-rich interface to manage support cases, format emails, handle metadata, and easily copy-paste templates into the Dynamics 365 environment.

## Overview

The application is built with **React** and **Vite**, using **Tailwind CSS** for styling. It runs entirely in the browser and persists data using `localStorage`, requiring no backend server. Cases can be backed up in bulk or exported individually as JSON (`MetaData_<caseNum>.json`) via the UI.

It uses a Bookmarklet script (found in `tmp/bookmarklet.js`) injected into the DfM (Dynamics 365) page to extract case metadata and communicate with the DfM-Ninja SPA via `postMessage`.

## Documentation & Templating

DfM-Ninja features a robust templating engine that automatically resolves variables like `{{caseNum}}`, `{{nextNC_XL}}`, `{{stageLog}}`, and dynamic email configurations from `settings.yml`. Users can construct custom "Stages" by uploading `.zip` templates containing custom HTML and YAML configuration, mapping natively to the tabbed interface.

For a full list of rendering variables and how they resolve, please see **[Variables Reference](docs/Variables.md)**.

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application at `http://localhost:5175`.

## Deployment & Release

### GitHub Pages (Automatic)
Pushing changes to the `main` branch automatically triggers a GitHub Action that builds and deploys the latest version to:
`https://jerrywdlee.github.io/DfM-Ninja/`

> [!IMPORTANT]
> Ensure **Settings > Pages > Build and deployment > Source** is set to **GitHub Actions**.

### GitHub Releases (Manual/Automated)
To create a formal release with a downloadable `dist.zip` on GitHub:
1. Ensure your `package.json` version is updated.
2. Run the release command:
   ```bash
   npm run release
   ```
This script automatically tags the current commit with the version number (e.g., `v0.1.5`) and pushes it to GitHub, triggering the release workflow.

## Built With
- React 18
- Vite
- Tailwind CSS
- JS-YAML (for settings & templates parsing)
- JSZip (for template bundle uploads)
