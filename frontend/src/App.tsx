"use client"

import React, { useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import EmailWizardPage from "./components/premium/mailcraftai/EmailWizardPage";
import SubjectLineOptimizer from "./components/premium/mailcraftai/subjectlineoptimizer";
import TonePolisher from "./components/premium/mailcraftai/tonepolisher";
import PayButton from "./components/razorpay/PayButton";
import { Header } from "@/components/homepage/header";
import { InteractiveFeatureCards } from "@/components/homepage/interactive-feature-cards";
import { HowItWorks } from "@/components/homepage/how-it-works";
import { MainHero } from "@/components/homepage/main-hero";
import { Footer } from "@/components/homepage/footer";
import { ConnectUs } from "@/components/homepage/connectus";
import PremiumDashboard from "./components/premium/premium";
import ChartBuilderPage from "./components/premium/excel/ChartBuilderPage";
import AISheetSummarizerPage from "./components/premium/excel/AISheetSummarizerPage";
import ExcelSuitePage from "./components/premium/excel/ExcelSuitePage";
import PDFHubPage from "./components/premium/pdf/PDFHubPage";
import AIWorkmatePage from "./components/premium/aiworkmate/AIWorkmatePage";
import AIAgentPage from "./components/premium/aiworkmate/AIAgentPage";
import MailCraftPage from "./components/premium/mailcraftai/MailCraftPage";
import SocialProPage from "./components/premium/socialpro/SocialProPage";
import CaptionProPage from "./components/premium/socialpro/CaptionProPage";
import HashtagStrategistPage from "./components/premium/socialpro/HashtagStrategistPage";
import AdCaptionGeneratorPage from "./components/premium/socialpro/AdCaptionGeneratorPage";
import SmartDocsPage from "./components/premium/smartdocs/SmartDocsPage";
import OfferLetterGeneratorPage from "./components/premium/smartdocs/OfferLetterGeneratorPage";
import DataFillPage from "./components/premium/datafill/DataFillPage";
import BulkMailerPage from "./components/premium/bulkmailer/BulkMailerPage";
import ExcelToEmailEnginePage from "./components/premium/bulkmailer/ExcelToEmailEnginePage";
import SmartTemplateLibraryPage from "./components/premium/bulkmailer/SmartTemplateLibraryPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLogin from "./components/admin/Adminlogin";
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Dashboard from "./components/premium/components/Dashboard";
import ExcelSuite from "./components/premium/components/ExcelSuite";
import ErrorTrendDetectorNew from './components/premium/excel/ErrorTrendDetectorNew';
import FormulaMaster from "./components/premium/excel/FormulaMaster";
import ExportWizard from "./components/premium/excel/ExportWizard";
import Settings from "./components/premium/Settings";
import PDFBrainPageWrapper from "./components/premium/pdf/PDFBrainPageWrapper";
import PDFChatAgentPage from "./components/premium/pdf/PDFChatAgentPage";
import SmartInvoiceGeneratorPage from "./components/premium/smartdocs/SmartInvoiceGeneratorPage";
import CaptionRewriterPage from "./components/premium/socialpro/CaptionRewriterPage";
import SmartDataExtractorPage from "./components/premium/pdf/SmartDataExtractorPage";
import PDFConverterPro from "./components/premium/pdf/PDFConverterPro";
import MailMergeAI from "./components/premium/bulkmailer/mailmergeai";

function HomePage() {
  return (
    <div className="text-white relative overflow-hidden">
      <Header />
      <div className="relative z-10">
        <div className="pb-8">
          <MainHero />
        </div>
        <div className="pt-4">
          <InteractiveFeatureCards />
        </div>
        {/* Reduce gap here by removing extra div and py-12 */}
        <HowItWorks />
        <ConnectUs />
      </div>
      <Footer />
    </div>
  );
}

// Route guards

function PremiumRoute() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isPremium) return <Navigate to="/" replace />;
  return <Outlet />;
}

// Admin route guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  if (!adminToken) return <Navigate to="/adminlogin" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Wait until authentication check is complete
    if (isAuthenticated && user) {
      if (user.isPremium && location.pathname === '/') {
        navigate('/premium', { replace: true });
      } else if (!user.isPremium && location.pathname.startsWith('/premium')) {
        navigate('/', { replace: true });
      }
    }
    // eslint-disable-next-line
  }, [isAuthenticated, user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        style={{ zIndex: 9999 }}
        toastClassName="custom-toast"
      />
      <div className="fade-in">
        <Routes>
          <Route path="/" element={<HomePage />} />
            {/* Full-screen SmartDocs routes (outside premium layout) */}
          <Route path="/smartdocs/offerletter" element={<OfferLetterGeneratorPage />} />
          <Route path="/smartdocs/smartinvoice" element={<SmartInvoiceGeneratorPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/paynow" element={<PayButton />} />
          <Route element={<PremiumRoute />}>
            <Route path="/premium" element={<PremiumDashboard />}>
              <Route index element={<Dashboard />} />
              <Route path="excel" element={<ExcelSuitePage />}>
                <Route index element={<ExcelSuite />} />
                <Route path="chartbuilder" element={<ChartBuilderPage />} />
                <Route path="aisheet/:chatId?" element={<AISheetSummarizerPage />} />
                <Route path="formulamaster/:chatId?" element={<FormulaMaster />} />
                <Route path="detect/:analysisId?" element={<ErrorTrendDetectorNew />} />
                <Route path="exportwizard" element={<ExportWizard />} />
              </Route>
              <Route path="pdfhub" element={<PDFHubPage />} />
              <Route path="pdfhub/brain" element={<PDFBrainPageWrapper />} />
              <Route path="pdfhub/chatagent" element={<PDFChatAgentPage />} />
              <Route path="pdfhub/smartdata" element={<SmartDataExtractorPage />} />  
              <Route path="pdfhub/converterpro" element={<PDFConverterPro />} />
              <Route path="aiworkmate" element={<AIWorkmatePage />} />
              <Route path="aiworkmate/aiagent" element={<AIAgentPage />} />
              <Route path="mailcraft" element={<MailCraftPage />} />
              <Route path="mailcraft/emailwizard" element={<EmailWizardPage/>} />
              <Route path="mailcraft/subjectlineoptimizer" element={<SubjectLineOptimizer/>} />
              <Route path="mailcraft/tonepolisher" element={<TonePolisher/>} />
              <Route path="socialpro" element={<SocialProPage />} />
              <Route path="socialpro/captionpro" element={<CaptionProPage />} />
              <Route path="socialpro/hashtagstrategist" element={<HashtagStrategistPage />} />
              <Route path="socialpro/adcaption" element={<AdCaptionGeneratorPage />} />
              <Route path="socialpro/captionrewriter" element={<CaptionRewriterPage />} />
              <Route path="smartdocs" element={<SmartDocsPage />} />
              <Route path="bulkmailer/mailmergeai" element={<MailMergeAI />} />
              <Route path="datafill" element={<DataFillPage />} />
              <Route path="bulkmailer" element={<BulkMailerPage />} />
              <Route path="bulkmailer/smarttemplates" element={<SmartTemplateLibraryPage />} />
              <Route path="bulkmailer/excel-engine" element={<ExcelToEmailEnginePage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/adminlogin" element={<AdminLogin/>}/>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
