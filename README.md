# Aurum Dashboard

A modern, responsive dashboard built with React following Atomic Design methodology.

## Features

- 🎨 Modern, clean UI design
- 📱 Fully responsive layout
- 🧩 Atomic Design structure (Atoms, Molecules, Organisms, Templates, Pages)
- ⚡ Built with React
- 🎯 Reusable component architecture
- 🔐 Authentication system (Login & Signup)
- 🎨 Professional icon library (react-icons)
- 🛡️ Protected routes and public routes

## Project Structure

```
src/
├── components/
│   ├── atoms/          # Basic building blocks (Button, Input, Icon, etc.)
│   ├── molecules/      # Simple functional units (SearchBar, MetricCard, FormField, etc.)
│   ├── organisms/      # Complex components (Sidebar, DashboardHeader, LoginForm, SignupForm, etc.)
│   ├── templates/      # Page layouts (DashboardTemplate, AuthTemplate)
│   ├── ProtectedRoute/ # Route protection component
│   └── PublicRoute/   # Public route component
├── pages/              # Page components (DashboardPage, LoginPage, SignupPage)
└── App.js              # Main application component with routing
```

## Getting Started

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm start
```

The app will open at [http://localhost:4001](http://localhost:4001)

## API Base URL Configuration

1. Copy `env.example` to `.env.local` (ignored by git).
   ```bash
   cp env.example .env.local
   ```
2. Adjust `PORT` if you need something other than the default `4001`.
3. Edit `REACT_APP_API_BASE_URL` with the environment you want to target.
4. Restart `npm start` after every change so React can read the updated value.

If the variable is missing, the app defaults to `http://localhost:4000`.

## Auth API cURL Playbook

Use the following cURL snippets to exercise the end-to-end auth flow. Replace `<<...>>` placeholders before running commands.

1. **Founder Signup** – creates the org and first user, returns `accessToken`.
   ```bash
   curl -X POST "${REACT_APP_API_BASE_URL}/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{
       "organizationName": "<<ORG_NAME>>",
       "email": "<<FOUNDER_EMAIL>>",
       "password": "<<STRONG_PASSWORD>>"
     }'
   ```
2. **Invite Another User** – requires the founder/owner token captured above.
   ```bash
   curl -X POST "${REACT_APP_API_BASE_URL}/organizations/invitations" \
     -H "Authorization: Bearer ${FOUNDER_TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "<<INVITEE_EMAIL>>",
       "role": "STAFF"
     }'
   ```
3. **Accept Invitation** – invitee redeems the token to join the org.
   ```bash
   curl -X POST "${REACT_APP_API_BASE_URL}/auth/accept-invite" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "<<INVITE_TOKEN>>",
       "email": "<<INVITEE_EMAIL>>",
       "password": "<<STRONG_PASSWORD>>"
     }'
   ```
4. **Login** – authenticate any existing user to obtain a session token.
   ```bash
   curl -X POST "${REACT_APP_API_BASE_URL}/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "<<USER_EMAIL>>",
       "password": "<<PASSWORD>>"
     }'
   ```
5. **Logout** – revoke the active token; all future calls will be rejected.
   ```bash
   curl -X POST "${REACT_APP_API_BASE_URL}/auth/logout" \
     -H "Authorization: Bearer ${LOGIN_TOKEN}"
   ```

Store the tokens that each response returns so they can be replayed in later steps.

### Building for Production

```bash
npm run build
```

## Atomic Design Methodology

This project follows the Atomic Design methodology:

- **Atoms**: Basic HTML elements and minimal React components (Button, Input, Icon, Text, Badge, Dot)
- **Molecules**: Simple functional units combining atoms (SearchBar, MetricCard, NavigationItem, Tab)
- **Organisms**: Complex components combining molecules and atoms (Sidebar, DashboardHeader, MetricGrid, Chart widgets)
- **Templates**: Page layouts arranging organisms (DashboardTemplate)
- **Pages**: Specific instances of templates with real data (DashboardPage)

## Components Overview

### Atoms
- Button
- Input
- Icon
- Text
- Badge
- Dot

### Molecules
- SearchBar
- MetricCard
- NavigationItem
- WorkspaceItem
- Tab
- FormField

### Organisms
- Sidebar
- DashboardHeader
- MetricGrid
- SalesPerformanceWidget
- AnalyticsChart
- VisitHeatmap
- VisitDonutChart
- EmptyWidget
- LoginForm
- SignupForm

## Authentication

The application includes a complete authentication system:
- **Login Page**: Sign in with email + password against the Aurum API
- **Signup Page**: Placeholder UI that currently redirects back to login after validation
- **Protected Routes**: Dashboard is only accessible when a valid access token exists
- **Public Routes**: Login/Signup redirect to dashboard if a token is already present
- **Logout**: Available in the sidebar footer and revokes the active session

## Responsive Design

The dashboard is fully responsive and adapts to different screen sizes:
- Desktop: Full sidebar and multi-column layout
- Tablet: Collapsible sidebar, adjusted grid layouts
- Mobile: Stacked layout, mobile-optimized navigation

## Icon Library

The project uses [react-icons](https://react-icons.github.io/react-icons/) for all icons, providing a consistent and professional look. Icons are accessed through the custom `Icon` atom component.

## License

MIT

