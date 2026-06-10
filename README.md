# 🚚 LoadKaro: India's First Hyper-Local Cargo Marketplace

![Status](https://img.shields.io/badge/Status-HackIndia%20VibeCoding%202026-blue)
![Tech Stack](https://img.shields.io/badge/Tech-React%20Native%20%7C%20FastAPI%20%7C%20PostGIS-success)
![AI/ML](https://img.shields.io/badge/AI-Gemini%201.5%20%7C%20OpenCV-orange)

## 📖 Executive Summary
**LoadKaro** is a hyper-local, real-time freight and cargo matching platform (Uber for Freight). Built for the **HackIndia VibeCoding Hackathon 2026**, it bridges the massive gap in India's unorganized local logistics sector by combining the price transparency of a **Reverse Auction** with the affordability of **Cargo Pooling**. It connects individual customers and B2B partners with truck drivers through an intuitive, dynamic, and fully responsive cross-platform application.

---

## 🎯 The Problem
1. **Inefficient Consumer Logistics:** Apps like Porter force users to pay for an entire Tata Ace (₹800+) even if they only need to move a single washing machine.
2. **Unorganized "Naka" Market:** Haggling with local tempo drivers is time-consuming, lacks price transparency, and offers no safety guarantees.
3. **No Loading Assistance:** Existing apps provide the vehicle but expect the customer to handle the heavy lifting.

---

## 💡 Core Innovations & Features

### 1. Intelligent AI Geocoding (Zero API Cost) 🧠
* Bypasses expensive map APIs by utilizing **Gemini 1.5 Flash AI** as a blazing-fast geocoding engine.
* Features real-time location autocompletion and instantaneous coordinate-to-address reverse geocoding on pin drag.

### 2. Reverse Bidding System (Real-Time Price Discovery) ⚖️
* **How it works:** A customer posts a cargo requirement. Nearby verified tempo drivers bid **down** on the fare within a 3-minute window via real-time WebSockets.
* **Impact:** Eliminates negotiation stress and creates fair competition.

### 3. "SahiYatri" (Cargo Pooling AI) 🤝
* **How it works:** Similar to ride-share, but for goods. Our ML algorithm groups overlapping origin/destination vectors.
* **Impact:** Two customers share one vehicle, each paying **40% less**. Unlocks a new market of micro-cargo.

### 4. Fully Dynamic Cross-Platform Maps & Smart Routing 🗺️
* **Mobile (Android/iOS):** Native map integration using OpenStreetMap (`<UrlTile>`) requiring no Google Maps API Key.
* **Web:** High-performance, interactive Leaflet map seamlessly integrated with React Native Web.
* **Smart Routing Engine:** Integrates with the public **OSRM (Open Source Routing Machine) API** to instantly calculate and draw real-world turn-by-turn road geometry. Calculates precise Indian fare estimates based on actual Haversine distance formulas.

### 5. "Helper on Demand" 🧑‍🔧
* Add 1-2 verified helpers (gig workers/students) to the booking for ₹100-150/hour to provide end-to-end service.

### 6. B2B "FlexiFleet" Subscriptions & Cargo Lanes 🏢
* Specialized pre-mapped lanes and priority booking routes for registered enterprise partners. Cloud kitchens and retail stores can buy monthly delivery quotas.

---

## 🏗️ Architecture & Tech Stack

### Frontend (Mobile & Web)
* **Framework:** Expo / React Native (Universal codebase for Web, iOS, and Android)
* **Navigation:** Expo Router
* **State Management:** Zustand
* **Maps:** `react-native-maps` (Mobile) & Leaflet (Web)
* **Styling:** Modern, responsive flexbox with Uber-inspired minimalist design tokens

### Backend Services & AI
* **Framework:** FastAPI (Python 3.10+) for async, high-performance microservices.
* **AI Integration:** Google Gemini API (Geocoding & NLP Search), OpenCV (AR Load Validator).
* **Routing & Spatial Data:** OSRM HTTP API and PostgreSQL with **PostGIS** extension.
* **Communication:** REST & WebSockets (Redis Pub/Sub for the active auction state).

---

## 🚀 Getting Started

### 1. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

```

### 2. Docker Setup
```bash
cd docker
cp .env.example .env
docker-compose up -d
```

### 3. Start the Frontend (Expo)
```bash
cd mobile
npm install
npx expo start

```

* Press `w` to open in your web browser.
* Scan the QR code with the **Expo Go** app to run on your physical Android or iOS device.

---

## 💡 How it works (User Flow)

1. **Grant Location:** Upon launch, the app grabs exact GPS coordinates and reverse-geocodes it via AI into a pickup street address.
2. **Select Drop-off:** Drag the red pin on the interactive map or type an address in the smart search box.
3. **Get Route & View Prices:** The app talks to OSRM to draw the shortest street route and calculates precise prices using the Haversine algorithm for both **Solo** and **SahiYatri** modes.
4. **Request:** Confirm the ride to launch the load into the live WebSocket auction pool!
5. **Driver Bidding:** Drivers in the zone see the load on their radar and compete by lowering their bids.

---

## 👨‍💻 Team Jee Jee Brats

**Captain:** Arsh Chakraborty

* **Contributors:** 
* `Arsh1233`
* `Chhaviii23`



*Built for the digital revolution of localized logistics.*
