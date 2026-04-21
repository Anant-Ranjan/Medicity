# MediCity: A Deep Dive Explanation

Welcome to the detailed explanation of how MediCity works under the hood. This guide is written in plain English to help you understand exactly how the different pieces of the platform talk to each other, how the "magic" search works, and how the data is stored in the database.

---

## 1. How Things Are Connected (Architecture Overview)

Think of MediCity as having a "Frontend" (what the user sees) and a "Backend" (the brain of the operation), both built inside a single framework called **Next.js**.

1. **The Frontend (React/Tailwind):** 
   When a user clicks "Find Care" or a super admin clicks "Public Health", they are interacting with React components. These components collect user inputs (like typing in a search bar or clicking a button) and send requests to the Backend.
   
2. **The Backend (Next.js API Routes):**
   The backend consists of specific URL endpoints (like `/api/search` or `/api/analytics`). When the backend receives a request from the frontend, it talks to the database, does the heavy lifting (like calculating distances or sorting data), and sends a clean package of data back to the frontend.

3. **The Connection (Middleware & Auth):**
   To make sure only the right people see the right things, we use a **Middleware**. Every time anyone tries to open a page or an API route, the middleware quickly checks their "ID badge" (a JWT Token stored in their cookies). If a General User tries to visit the Super Admin dashboard, the middleware catches them and redirects them away before the page even loads.

---

## 2. The Advanced Search Engine: How It Works

The search feature in MediCity isn't a basic "find exact word" search. It is a "Dual-Mode NLP (Natural Language Processing) Search". Here is exactly how it works from the moment a user types a query.

### The Problem it Solves
Users don't always search the same way. 
- Person A might type: *"Cardiologist near me"* (Looking for a specific doctor).
- Person B might type: *"How many cases of Dengue Fever are there?"* (Looking for public health statistics).

### The Frontend Step
When you type a query in the search bar and press enter, the frontend grabs your text, grabs your current GPS location (longitude and latitude), and sends it to the backend via a `POST` request to `/api/search`.

### The Backend Step (The "Brain")
Once the `/api/search` route receives your query, it goes through a specific pipeline:

1. **Intent Classification (Figuring out what you want):**
   The backend scans your sentence for "trigger words". 
   - If it sees words like *"cases"*, *"outbreak"*, *"spread"*, or *"number of"*, it flags the query as **STATISTICAL**.
   - If it sees words like *"near me"*, *"doctor"*, *"emergency"*, or a specific specialist (like *"Cardiologist"*), it flags the query as **ROUTING**.

2. **If it's a STATISTICAL query:**
   - It searches the `EpidemiologyRecord` database.
   - It looks for the disease you typed (e.g., "Dengue Fever").
   - It aggregates (adds up) all the cases across all hospitals and groups them by severity and age group.
   - It sends this statistical package back to the frontend, which renders the data into beautiful charts.

3. **If it's a ROUTING query:**
   - It searches the `Tenant` (Hospital) database.
   - **Geospatial Magic:** It uses a MongoDB feature called `$nearSphere`. Since we sent the user's GPS coordinates, MongoDB automatically calculates the distance of every hospital from the user and sorts them from closest to furthest.
   - **Emergency Sorting:** If the user clicked the "Emergency Route" button, the backend ignores distance slightly and prioritizes hospitals that have **free ICU beds** and the **shortest Emergency Room wait times**.
   - It sends the list of hospitals back to the frontend to be displayed on the map and in the list view.

---

## 3. The Database Schema (How Data is Stored)

We use **MongoDB** (a NoSQL database) and **Mongoose** (a library that helps structure our data). Instead of rigid tables (like Excel), MongoDB stores data as "Documents" (like JSON objects). 

We have three main "Collections" (Tables) in our database:

### A. The `User` Schema
This stores the people who log into the app.
- **`email` & `passwordHash`**: Securely stores login credentials. (Passwords are scrambled/hashed before saving so no one can read them).
- **`role`**: This is crucial. It can be `general_user`, `hospital_admin`, or `super_admin`. This single word dictates what the user is allowed to do.
- **`tenantId`**: If the user is a `hospital_admin`, this field links them directly to their specific hospital. This ensures they can only edit their own hospital's data.

### B. The `Tenant` Schema (The Hospital)
This stores all the data about a hospital facility.
- **`name`, `address`, `contact`**: Basic information.
- **`location`**: Stored as a special `GeoJSON` object containing an array: `[longitude, latitude]`. This is what allows our search engine to do distance-based math instantly.
- **`bedTelemetry`**: An object containing `icu`, `general`, and `pediatric` beds. Each has a `total` and `occupied` number. This allows us to calculate percentages (e.g., "ICU is 90% full!").
- **`machinery`**: Tracks the status (`Operational`, `Maintenance`, `Offline`) of MRIs, CT Scanners, etc.
- **`currentERWaitTimeMinutes`**: A simple number that admins update to show how busy their emergency room is.

### C. The `EpidemiologyRecord` Schema
This is the public health intelligence data. Every time a hospital admin reports a disease, a new document is created here.
- **`tenantId` & `tenantName`**: Tells us which hospital reported this data.
- **`diseaseName` & `category`**: What the disease is (e.g., "Malaria", category: "Vector-Borne").
- **`caseCount`**: Total number of patients.
- **`severityBreakdown`**: How bad the cases are (`mild`, `moderate`, `severe`, `critical`).
- **`ageGroupBreakdown`**: Who is getting sick (`children`, `adults`, `elderly`).
- **`reportDate` & `location`**: When and where this cluster happened.

### How they connect (The Implementation)
The schemas are implemented using `mongoose.Schema`. We add **Indexes** to make searching lightning fast. For example, in the `Tenant` schema, we have:
`TenantSchema.index({ location: '2dsphere' });`
This tells the database: *"Hey, organize all these locations on a 3D spherical map of the Earth so that when a user asks for 'closest hospitals', you can find them instantly without checking every single row."*

When the Super Admin opens the Analytics page, the backend grabs *all* the `Tenant` documents and *all* the `EpidemiologyRecord` documents, merges the data, does the math (like calculating global ICU capacity), and sends it to the frontend to power the heatmaps and graphs. 
