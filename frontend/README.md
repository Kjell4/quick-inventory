# QuickInventory - Diploma Project

QuickInventory is a modern frontend inventory management web application developed as a diploma project.  
The system is designed to assist small shops and businesses in managing products, recording daily sales, and monitoring key business statistics through a responsive dashboard interface.

The project is available online via Vercel: [Visit Project](https://quick-inventory-last.vercel.app)

---

# Project Purpose

The objective of this project is to demonstrate practical frontend development skills using modern React ecosystem tools, while implementing a structured inventory and sales management system with role-based access control.

This version is frontend-only and focuses on user interface architecture, state management, and responsive design.

---

# Project Overview

QuickInventory includes:

- User authentication interface (UI simulation)
- Role-based access (Manager / Seller)
- Product management system
- Daily sales tracking
- Business statistics dashboard
- Profile management page
- Fully responsive layout

> Note: This project currently does not include a backend or database. All data is stored in local React state.

---

# Technology Stack

- React 19
- TypeScript
- TailwindCSS
- Radix UI Primitives
- React Hook Form
- Recharts (charts and analytics)
- Lucide Icons
- Framer Motion
- Class Variance Authority (CVA)
- clsx + tailwind-merge
- Context API for state management
- PostCSS + Autoprefixer

---

# Role-Based Access

### Manager
- Dashboard
- Products Management
- Daily Sales
- Profile

### Seller
- Dashboard
- Daily Sales
- Profile

---

# Main Features

1. **Authentication (UI Demo)**
   - Login page
   - Signup page
   - Role selection
   - Simulated authentication flow

2. **Dashboard**
   - Total income overview
   - Estimated expenses
   - Net profit calculation
   - Low stock alerts
   - Recent sales table
   - Interactive charts

3. **Product Management**
   - Add, edit, delete products
   - Stock quantity tracking

4. **Daily Sales**
   - Record product sales
   - Automatic calculation of sale totals
   - Stock updates after each sale

5. **Profile Page**
   - View user information
   - Display role and permissions
   - Logout functionality

---

# Frontend Scope Limitation

- No real API calls
- No backend server
- No database persistence
- No JWT authentication
- Data resets on page refresh

---

# Installation and Setup

> Ensure all dependencies are installed prior to running the project.

### Step 1 - Install Dependencies

```bash
npm install --legacy-peer-deps
```

Install missing modules if necessary:

```bash
npm install --legacy-peer-deps \
@radix-ui/react-accordion \
@radix-ui/react-alert-dialog \
@radix-ui/react-aspect-ratio \
@radix-ui/react-avatar \
@radix-ui/react-checkbox \
@radix-ui/react-collapsible \
@radix-ui/react-context-menu \
@radix-ui/react-dialog \
@radix-ui/react-dropdown-menu \
@radix-ui/react-hover-card \
@radix-ui/react-label \
@radix-ui/react-menubar \
@radix-ui/react-navigation-menu \
@radix-ui/react-popover \
@radix-ui/react-progress \
@radix-ui/react-radio-group \
@radix-ui/react-scroll-area \
@radix-ui/react-select \
@radix-ui/react-separator \
@radix-ui/react-slider \
@radix-ui/react-slot \
@radix-ui/react-switch \
@radix-ui/react-tabs \
@radix-ui/react-toggle \
@radix-ui/react-toggle-group \
@radix-ui/react-tooltip \
class-variance-authority \
clsx \
cmdk \
embla-carousel-react \
lucide-react \
react-day-picker \
recharts \
vaul \
sonner \
react-hook-form \
react-resizable-panels \
input-otp \
motion \
next-themes
```

---

### Step 2 - Configure TailwindCSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js`:

```js
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Add directives to `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import global CSS in `index.tsx`:

```ts
import './styles/globals.css';
```

---

# Common Errors and Fixes

- Avoid including version numbers in imports
- Always install dependencies with `--legacy-peer-deps`
- Ensure `node_modules` exists and `package.json` is correct
- If needed: remove `node_modules` and `package-lock.json` and reinstall

---

# Required Local Utility Files

- `utils.ts` → `cn()` helper (clsx + tailwind-merge)
- `use-mobile.ts` → `useIsMobile()` hook
- `toggle.tsx`
- `tooltip.tsx`

---

# Running the Project

Start development server:

```bash
npm start
```

Open in browser: `http://localhost:3000`

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

---

# Future Development Possibilities

The following enhancements could transform the system into a production-ready full-stack application:

- Backend API (Node.js / Express / Django)
- Database integration (PostgreSQL / MySQL / MongoDB)
- JWT authentication
- Export to PDF / CSV reports
- Advanced analytics
- Multi-user authentication and role management
