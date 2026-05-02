import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import Admin from './Admin';
import Report from './Report';
import DetailedReport from './DetailedReport';
import VisionMeet from './VisionMeet';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/report" element={<Report />} />
        <Route path="/detailed-report" element={<DetailedReport />} />
        <Route path="/vision-meet" element={<VisionMeet />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
