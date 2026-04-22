import React from "react";
import { useNavigate } from "react-router-dom";

const UserSim = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "40px", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
      <h2>Realistic Simulation</h2>
      <p style={{ color: "#666" }}>Login and SOS flow coming in the next update.</p>
      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "16px",
          padding: "10px 24px",
          background: "#dc3545",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "0.9rem",
        }}
      >
        Back to Home
      </button>
    </div>
  );
};

export default UserSim;
