import ReactDOM from "react-dom/client"
import React from "react"
import App from "./App.tsx"
import "./index.css"
import { AuthProvider } from "./context/AuthContext"
import { BrowserRouter as Router } from "react-router-dom"
import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''; // Ensure this is correctly set in production .env files

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
