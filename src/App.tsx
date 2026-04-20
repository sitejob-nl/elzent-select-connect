import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import LoginPage from "./pages/LoginPage";
import WachtwoordInstellen from "./pages/WachtwoordInstellen";
import DashboardPage from "./pages/DashboardPage";
import AanbodPage from "./pages/AanbodPage";
import DetailPage from "./pages/DetailPage";
import FavorietenPage from "./pages/FavorietenPage";
import ProfilePage from "./pages/ProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAanbod from "./pages/admin/AdminAanbod";
import AdminKlanten from "./pages/admin/AdminKlanten";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminToegang from "./pages/admin/AdminToegang";
import AdminLocaties from "./pages/admin/AdminLocaties";
import AdminEmail from "./pages/admin/AdminEmail";
import AdminEmailDetail from "./pages/admin/AdminEmailDetail";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import AdminEmailTemplateEditor from "./pages/admin/AdminEmailTemplateEditor";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/wachtwoord-instellen" element={<WachtwoordInstellen />} />
            {/* Client routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/aanbod" element={<ProtectedRoute><AanbodPage /></ProtectedRoute>} />
            <Route path="/aanbod/:slug" element={<ProtectedRoute><DetailPage /></ProtectedRoute>} />
            <Route path="/favorieten" element={<ProtectedRoute><FavorietenPage /></ProtectedRoute>} />
            <Route path="/profiel" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/aanbod" element={<AdminRoute><AdminAanbod /></AdminRoute>} />
            <Route path="/admin/klanten" element={<AdminRoute><AdminKlanten /></AdminRoute>} />
            <Route path="/admin/leads" element={<AdminRoute><AdminLeads /></AdminRoute>} />
            <Route path="/admin/toegang" element={<AdminRoute><AdminToegang /></AdminRoute>} />
            <Route path="/admin/locaties" element={<AdminRoute><AdminLocaties /></AdminRoute>} />
            <Route path="/admin/email" element={<AdminRoute><AdminEmail /></AdminRoute>} />
            <Route path="/admin/email/templates" element={<AdminRoute><AdminEmailTemplates /></AdminRoute>} />
            <Route path="/admin/email/templates/:slug" element={<AdminRoute><AdminEmailTemplateEditor /></AdminRoute>} />
            <Route path="/admin/email/:id" element={<AdminRoute><AdminEmailDetail /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
