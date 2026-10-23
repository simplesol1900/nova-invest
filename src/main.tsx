import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import AdminApp from "./AdminApp"
import "./index.css"

const adminHosts = new Set(["nova.name.ng", "www.nova.name.ng"])
const isAdminPortal =
  adminHosts.has(window.location.hostname.toLowerCase()) ||
  window.location.pathname.startsWith("/admin")
const RootApp = isAdminPortal ? AdminApp : App

document.title = isAdminPortal ? "NOVA INVEST Admin Portal" : "NOVA INVEST"

const description = isAdminPortal
  ? "Secure administration portal for managing NOVA INVEST members, deposits, withdrawals, KYC, and investments."
  : "NOVA INVEST helps members manage investments across global stock and metal markets."

document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", description)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)
