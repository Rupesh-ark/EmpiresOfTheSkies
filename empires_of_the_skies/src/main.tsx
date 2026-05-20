import React from 'react';
import ReactDOM from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';
import HomePage from './pages/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <CssBaseline />
      <HomePage />
    </ErrorBoundary>
  </React.StrictMode>,
); 