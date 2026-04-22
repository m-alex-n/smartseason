import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import { Layout } from "./components/Layout.jsx";
import { loadAuth } from "./authStore.js";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FieldDetailPage } from "./pages/FieldDetailPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";

function RequireAuth({ children }) {
  const { token } = loadAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/fields/:fieldId"
          element={
            <RequireAuth>
              <FieldDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
