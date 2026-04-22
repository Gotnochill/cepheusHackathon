// src/components/LatestAlerts.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './LatestAlerts.css';

const LatestAlerts = () => {
  const [crises, setCrises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCrises = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${apiUrl}/api/crises`);
        setCrises(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchCrises();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="alerts-container">
      <h2>Latest Crisis Reports</h2>
      {crises.length === 0 ? (
        <div>No live reports yet</div>
      ) : (
        <ul>
          {crises.map((crisis) => (
            <li key={crisis._id}>
              <h3>{crisis.name}</h3>
              <p>{crisis.description}</p>
              <p>Location: {crisis.location.coordinates.join(', ')}</p>
              <p>Severity: {crisis.severity}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LatestAlerts;
