import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { BloodBankProvider } from './context/BloodBankContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <BloodBankProvider>
        <App />
      </BloodBankProvider>
    </BrowserRouter>
  </React.StrictMode>,
);