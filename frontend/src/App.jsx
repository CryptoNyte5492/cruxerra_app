import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Uploader from "./pages/Uploader";
import RunnerList from "./pages/RunnerList";
import Login from "./pages/Login";
import RunnerDetail from "./pages/RunnerDetail";

function ProtectedRoute({children}) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Home/>} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Uploader/>
          </ProtectedRoute>} />
        <Route path="/runner/:file_id" element={
          <ProtectedRoute>
            <RunnerList/>
          </ProtectedRoute>
        } />
        <Route path="/runner/:file_id/:athlete/:race_id" element={
          <ProtectedRoute>
            <RunnerDetail/>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" />} /> {/** Redirect to login page for any non-valid url */}
      </Routes>
    </BrowserRouter>
  );
}
