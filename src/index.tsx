//@ts-nocheck
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';
// import Notifications from './Pages/Notification';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <>
    <App />
    {/* <Notifications /> */}
  </>
);
