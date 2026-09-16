import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/RequireAuth";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MfaSetup from "./pages/MfaSetup";
import AppShell from "./pages/AppShell";
import Cases from "./pages/Cases";
import Search from "./pages/Search";
import Risk from "./pages/Risk";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Cases />} />
            <Route path="search" element={<Search />} />
            <Route path="risk" element={<Risk />} />
            <Route path="mfa-setup" element={<MfaSetup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
