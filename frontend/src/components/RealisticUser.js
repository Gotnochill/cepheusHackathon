import React from "react";
import { useNavigate } from "react-router-dom";

const userUrl = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/realistic-user.html`
  : "/realistic-user.html";

const RealisticUser = () => {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{
        padding: "10px 20px",
        background: "#2c3e50",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate("/realistic")}
          style={{
            padding: "6px 14px",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Back
        </button>
        <span style={{ fontWeight: 600, fontSize: "1rem" }}>
          Emergency SOS Portal
        </span>
      </div>
      <iframe
        src={userUrl}
        title="Emergency SOS"
        style={{ flex: 1, border: "none", width: "100%" }}
        allow="geolocation"
      />
    </div>
  );
};

export default RealisticUser;
