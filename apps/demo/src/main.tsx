import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Demo login page with RhythmGuard integration
// Built in session 5. See IMPLEMENTATION_SPEC.md section 3.1 for integration API.

function App() {
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480, margin: '80px auto', padding: 24 }}>
      <h1>RhythmGuard Demo</h1>
      <p>Login page with RhythmGuard widget. Built in session 5.</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
