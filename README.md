# DfM-Ninja

[日本語版はこちら (docs/README_ja.md)](docs/README_ja.md)

DfM-Ninja is a premium, frontend-only SPA (Single Page Application) designed specifically for Dynamics 365 customer support engineers. It provides a clean, fast, and feature-rich interface to manage support cases, format emails, handle metadata, and streamline communication by bridging the gap between Dynamics 365 and LLM-assisted workflows.

## Overview

The application is built with **React 19** and **Vite 7**, using **Tailwind CSS 4** for its modern, dark-themed UI. It runs entirely in the browser and persists data using **IndexedDB**, requiring no backend server. Cases can be backed up in bulk or exported individually as JSON via the UI.

It integrates with the DfM (Dynamics 365) page via a specialized Bookmarklet, enabling seamless metadata extraction and real-time communication between the Dynamics environment and Ninja SPA.

## Key Features

### 🔍 Full-Text Search (`Cmd+P` / `Ctrl+P`)
Global search functionality that scans all stored cases in IndexedDB using regular expressions. Results are displayed in an interactive accordion view, allowing users to navigate directly to specific stages within a case.

### 🥷 Bookmarklet Integration
The Bookmarklet injects a Ninja button into Dynamics 365, which extracts case metadata and automatically focuses or opens the DfM-Ninja tab, ensuring a smooth context switch.

### 🛠️ Premium Modern UI (v0.6+)
- **2-Column Layout**: Standardized workflow with Prompts/Guidelines on the left and Input fields on the right.
- **Auto-Save**: All progress is automatically persisted to IndexedDB as you type, preventing data loss during navigation.
- **Dynamic Content**: Rich template engine supporting EJS logic for complex conditional formatting.

### 🚀 Update & Version Control
Integrated notification system that intelligently handles:
- **Welcome**: Onboarding for new users.
- **Upgrade**: Guided transition for users coming from legacy versions.
- **Update**: Real-time notifications for new feature releases (v0.6.3+).

### 🔰 Variables List Modal
A comprehensive builder and reference for all available template variables, including:
- **Editable Var.**: User-defined global variables.
- **Dynamic Var.**: Date/NC calculators with live previews.
- **Stage Var.**: Variables extracted directly from the current UI.
- **Sys Temp.**: Registered system snippets like `attentions` or `teamsDisclaimer`.

## Documentation

- **[Variables Reference](docs/Variables.md)**: Full list of rendering variables and EJS logic.
- **[Japanese README](docs/README_ja.md)**: Localized documentation for Japanese users.

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
4. Access the application at `http://localhost:5178`.

> [!NOTE]
> `src/utils/bookmarkletCode.js` is an auto-generated file. It is created automatically when running `npm run dev` or `npm run build`.

## Local (Offline) Usage

DfM-Ninja can be packaged for offline use (e.g., from a `file:///` path) by running:
```bash
npm run build:local
```
This command generates a `dist.zip` with relative asset paths and localized vendor dependencies (jQuery, EJS).

## License

MIT License - see the [LICENSE](LICENSE) file for details.
