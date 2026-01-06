import CalendarPage from "./pages/CalendarPage";
import { TasksPage } from "./pages/TasksPage";
// اگر named export است، خط بالا را این کن:  import { TasksPage } from "./pages/TasksPage";

export default function App() {
  // فعلاً فقط برای تست یکی را نمایش بده
  return <CalendarPage />;
  // یا:
  // return <TasksPage />;
}