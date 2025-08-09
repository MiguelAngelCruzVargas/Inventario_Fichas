import React, { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function Root() {
  useEffect(() => {
    const onWheel = (e) => {
      const el = e.target;
      if (el && el.tagName === 'INPUT' && el.type === 'number') {
        el.blur();
        e.preventDefault();
      }
    };
    const onKeyDown = (e) => {
      const el = e.target;
      if (el && el.tagName === 'INPUT' && el.type === 'number') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
        }
      }
    };
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown, { passive: false });
    return () => {
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<Root />)
