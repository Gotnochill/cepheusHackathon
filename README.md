# Disaster Management Platform

A real-time disaster relief coordination platform designed to streamline aid distribution using crowdsourced data, geolocation tracking, and AI-driven demand prediction.

## 🌐 Live Demo

**Frontend:** [https://disaster-manager-frontend.onrender.com](https://disaster-manager-frontend.onrender.com)

**Backend API:** [https://disaster-manager.onrender.com](https://disaster-manager.onrender.com)

> **Note:** Free tier hosting - initial load may take up to 60 seconds as the server spins up from sleep mode.

---

## Quick Start - Run Locally

### Prerequisites
- Node.js and npm installed
- Python 3.x installed
- MongoDB Atlas account

### Setup & Run

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/Gotnochill/Disaster-Manager.git
   cd Disaster-Manager
   npm install
   cd frontend
   npm install
   cd ..
   ```

2. **Configure environment variables**
   - Create a `.env` file in the root directory
   - Add your MongoDB connection string:
     ```
     MONGODB_URI=your_mongodb_connection_string_here
     PORT=3000
     ```

3. **Install Python dependencies**
   ```bash
   pip install pymongo pandas python-dotenv dash plotly
   ```

4. **Start the backend server**
   ```bash
   npm run dev
   ```
   This initializes faker inputs to simulate crowdsourced disaster data.

5. **Run the Python data importer (optional)**
   ```bash
   python importer.py
   ```
   This starts a real-time dashboard for data analytics.

6. **Start the React frontend**
   ```bash
   cd frontend
   npm start
   ```
   If prompted to change the server port, press 'y'.

7. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

The React application provides three main features:
- **Dashboard**: Real-time data analytics
- **Live Map**: Map integration with emergency service details
- **Latest Alerts**: Most recent emergency service inquiries

---

## Overview

This project is a real-time disaster relief coordination platform that enables efficient response to disasters through crowdsourced data collection and AI-driven insights.

## Features

- **Live Disaster Reporting**: Real-time submission of disaster reports
- **Geolocation Tracking**: Visualization of affected areas using Leaflet.js
- **AI Demand Prediction**: Predicts where aid is needed most
- **Volunteer & NGO Coordination**: Enables efficient communication between responders
- **Data Analytics**: Insights from stored disaster data using Python-based Tableau integration

## Tech Stack

- **Frontend**: React, HTML, CSS, JavaScript, Leaflet.js
- **Backend**: Node.js, Express.js, Faker
- **Database**: MongoDB (Atlas)
- **Real-time Communication**: Socket.io
- **Data Analysis**: Python, Pandas, Dash, Plotly, Tableau

## API Endpoints

### Get All Disaster Reports
```
GET /api/disasters
```
Retrieve all disaster reports from the database.

### Submit New Disaster Report
```
POST /api/disasters
```
**Request Body:**
```json
{
  "name": "John Doe",
  "type": "Disaster",
  "location": { 
    "type": "Point", 
    "coordinates": [81.6000, 21.2100] 
  },
  "severity": 3,
  "description": "Severe flooding reported in the area",
  "affectedAreas": ["Naya Raipur", "Pandri"]
}
```

### Get Specific Disaster Report
```
GET /api/disasters/:id
```
Get details of a specific disaster report by ID.

## Python-Based Tableau Integration

Extract data from MongoDB for visualization:

```python
from pymongo import MongoClient
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv('MONGODB_URI'))
db = client["test"]
collection = db["disasters"]

data = pd.DataFrame(list(collection.find()))
data.to_csv("disaster_data.csv", index=False)
```

Load the exported CSV into Tableau for advanced visualization and analytics.

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## License

MIT

---

**Code-Phoenix-25** - Built for the "Code of the Phoenix" 2025 Hackathon

