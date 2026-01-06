import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/features/auth/auth";
import TasksPage from "@/pages/TasksPage";
import UsersPage from "@/pages/UsersPage";
import { CalendarPage } from "@/pages/CalendarPage";
import InboxPage from "@/pages/InboxPage";


function Protected({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <div className="app-bg p-8 text-foreground">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          {/* Dashboard (current): Jalali Calendar */}
          <Route index element={<CalendarPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="/inbox" element={<InboxPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
