import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Documents } from "./pages/Documents";
import { Chat } from "./pages/Chat";
import { Quiz } from "./pages/Quiz";
import { Flashcards } from "./pages/Flashcards";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./components/theme-provider";

const queryClient = new QueryClient();

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="study-mentor-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:sessionId" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/quizzes" element={<Quiz />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Admin Route */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
      </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
