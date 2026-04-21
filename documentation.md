# MediCity Project Documentation

## Project Overview
MediCity is a cutting-edge healthcare intelligence and management platform designed to connect patients with appropriate care facilities while providing robust epidemiological surveillance for health administrators. 

The application is broken into three main personas:
1. **General Users:** Can search for hospitals, filter by specialists, and receive emergency routing.
2. **Hospital Admins:** Can manage their specific hospital's telemetry (bed availability, machinery status) and report epidemiological data.
3. **Super Admins:** Have global oversight, can manage all hospitals, and view real-time public health analytics.

## Technology Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (via `index.css` and utility classes)
- **Database:** MongoDB Atlas (via Mongoose)
- **Authentication:** Custom JWT-based edge middleware with HTTP-only cookies
- **Charting:** Custom-built zero-dependency SVG chart library (`src/components/Charts.tsx`)
- **PDF Generation:** `jspdf` and `html2canvas`

## Key Features
### 1. Dual-Mode NLP Search Engine
The search system parses natural language queries to determine intent:
- **Routing Queries:** E.g., "I need a cardiologist near me" filters for hospitals with specific specialists.
- **Statistical Queries:** E.g., "Show me dengue fever cases" routes to disease statistics.
- **Emergency Mode:** Instantly sorts hospitals by ICU availability, ER wait times, and proximity.

### 2. Live Telemetry & Resource Tracking
Hospitals broadcast live data to the platform:
- **Beds:** ICU, General, and Pediatric capacities.
- **Machinery:** MRI, CT Scanner, Dialysis, ECMO, and Ventilators.
- **Traffic:** Current ER wait times.

### 3. Epidemiological Surveillance
Clinicians report disease clusters and cases:
- Anonymous reporting of diseases, case counts, severity breakdowns, and age group demographics.
- Data feeds directly into the Super Admin analytics dashboard.

### 4. Advanced Analytics Dashboard
A high-fidelity, interactive dashboard for Super Admins:
- **Geo-Heatmap:** Visualizes disease clusters dynamically.
- **Disease & Hospital Analysis:** Stacked bar charts for severity, donut charts for categories, and hospital burden rankings.
- **Trend Analysis:** Tracks epidemiological curves over time.
- **Hospital Management:** Full CRUD operations on the hospital directory.
- **PDF Reporting:** Automated client-side PDF generation of the current intelligence state.

### 5. Role-Based Access Control (RBAC)
Middleware strictly guards routes:
- `/admin/*` is restricted to Hospital Admins and Super Admins.
- `/analytics/*` is restricted solely to Super Admins.
- Dynamic navigation synchronizes with the active user session.

## Data Schema Models
- **User:** Stores credentials, roles, and user preferences.
- **Tenant:** Stores hospital metadata, live telemetry, and machinery statuses.
- **EpidemiologyRecord:** Stores disease outbreak data linked to specific tenants.

## Setup Instructions
1. Clone the repository and run `npm install`.
2. Configure `.env.local` with `MONGODB_URI` and `JWT_SECRET`.
3. Run `npm run dev` to start the development server.
4. Run the seed script via `GET /api/seed?secret=medicity_seed_2026` to populate the database with realistic sample data.
