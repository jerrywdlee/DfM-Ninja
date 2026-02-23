# DfM-Ninja

DfM-Ninja is a premium, frontend-only SPA (Single Page Application) designed to assist Dynamics 365 customer support engineers. It provides a clean, fast, and feature-rich interface to manage support cases, format emails, handle metadata, and easily copy-paste templates into the Dynamics 365 environment.

## Overview

The application is built with **React** and **Vite**, using **Tailwind CSS** for styling. It runs entirely in the browser and persists data using `localStorage`, requiring no backend server.

It uses a Bookmarklet script (found in `tmp/bookmarklet.js`) injected into the DfM (Dynamics 365) page to extract case metadata and communicate with the DfM-Ninja SPA via `postMessage`.

## Documentation & Templating

DfM-Ninja features a robust templating engine that automatically resolves variables like `{{caseNum}}`, `{{nextNC_XL}}`, and dynamic email configurations from `settings.yml`.

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

## Built With
- React 18
- Vite
- Tailwind CSS
- JS-YAML (for settings & templates parsing)
- JSZip (for template bundle uploads)
