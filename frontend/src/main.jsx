import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import './index.css';
import App from './App.jsx';
import './css/App.css';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
     <BrowserRouter>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ee4d2d',
          borderRadius: 8,
          fontFamily: 'Helvetica Neue, sans-serif',
        },
        components: {
          Button: {
            fontWeight: 600,
          },
        },
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
     </BrowserRouter>
  </StrictMode>
);
