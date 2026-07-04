# FreshLoop 🥑 

**FreshLoop** is an AI-powered grocery management and zero-waste recipe generation application. Utilizing computer vision via Google's Gemini models, it assesses the freshness of fruits and vegetables, tracks your inventory, and intelligently generates recipes to help you consume ingredients before they spoil.

## 🌟 Key Features

*   **📸 AI Produce Scanning**: Upload or take a picture of your produce. The AI instantly identifies items, evaluates their ripeness (0-100 score, higher score means higher freshness), estimates shelf life, and provides storage recommendations.
*   **🍳 Zero-Waste Recipe Generator**: Automatically creates tailored recipes that prioritize ingredients nearing their expiration date (Urgent / High Priority).
*   **☁️ Cloud Sync & Authentication**: Secure user authentication and real-time database syncing powered by Firebase, ensuring your data is accessible across devices.
*   **📊 Smart Inventory Management**: Visually categorizes food items by their freshness status (Fresh, Semi-fresh, Rotten) and provides actionable consumption insights to reduce food waste.
*   **⚡ Tech Stack**: Built with React 19, Vite, Tailwind CSS, Express (Serverless APIs), and Firebase.

---

## 📸 Screenshots

![Dashboard Preview - Personal Mode](<./assets/dashboard-personal mode.png>)

![Dashboard Preview - Business Mode](<./assets/dashboard-business mode.png>)

![Scan and Analysis](<./assets/scan and analysis.png>)

![Saved Plan](<./assets/saved plan.png>)

![Create a recipe - step 1](<./assets/create a recipes1.png>)

![Create a recipe - step 2](<./assets/create a recipe2.png>)

![Suggested Recipes](<./assets/suggested recipes.png>)

![My Cookbook](<./assets/my cookbook.png>)

---

## 🚀 Getting Started (Local Development)

If you'd like to run this project locally on your machine, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/JielingGong/freshloop.git
cd FreshLoop
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add your Firebase configuration and Gemini API Key:

```env
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### 4. Run the development server
```bash
npm run dev
```
Open `http://localhost:3000` to view the app in the browser.

---

## 🛠️ Architecture Overview

*   **Frontend**: React (TypeScript), Tailwind CSS, Recharts for data visualization.
*   **Backend / API**: Express.js (deployed as Vercel Serverless Functions via `api/index.ts`).
*   **AI Integration**: Google Gen AI SDK (`gemini-2.5-flash` / `gemini-2.0-pro-exp-02-05`).
*   **Database & Auth**: Firebase Firestore (NoSQL database) and Firebase Authentication.

---

## 👤 Author

**Serena Gong**
* Email: serenagong01@outlook.com

