// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/AdminDashboard";
import UserSim from "./components/UserSim";
import LatestAlerts from "./components/LatestAlerts";
import RealisticGateway from "./components/RealisticGateway";
import RealisticAdmin from "./components/RealisticAdmin";
import RealisticUser from "./components/RealisticUser";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/user" element={<UserSim />} />
        <Route path="/latest-alerts" element={<LatestAlerts />} />
        <Route path="/realistic" element={<RealisticGateway />} />
        <Route path="/realistic/admin" element={<RealisticAdmin />} />
        <Route path="/realistic/user" element={<RealisticUser />} />
      </Routes>
    </Router>
  );
}

export default App;
