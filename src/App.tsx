import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AanbodPage from "./pages/AanbodPage";
import DetailPage from "./pages/DetailPage";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAanbod from "./pages/admin/AdminAanbod";
import AdminKlanten from "./pages/admin/AdminKlanten";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminToegang from "./pages/admin/AdminToegang";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            {/* Client routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/aanbod" element={<ProtectedRoute><AanbodPage /></ProtectedRoute>} />
            <Route path="/aanbod/:slug" element={<ProtectedRoute><DetailPage /></ProtectedRoute>} />
            <Route path="/profiel" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/aanbod" element={<AdminRoute><AdminAanbod /></AdminRoute>} />
            <Route path="/admin/klanten" element={<AdminRoute><AdminKlanten /></AdminRoute>} />
            <Route path="/admin/leads" element={<AdminRoute><AdminLeads /></AdminRoute>} />
            <Route path="/admin/toegang" element={<AdminRoute><AdminToegang /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
