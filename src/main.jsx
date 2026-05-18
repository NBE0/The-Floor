import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameProvider } from './context/GameContext';
import { ImageDbProvider } from './context/ImageDbContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ImageDbProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </ImageDbProvider>
  </React.StrictMode>
);
