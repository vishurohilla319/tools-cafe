import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { FavoritesProvider as FavProvider } from './context/FavoritesContext';
import { ConversionLimitProvider } from './context/ConversionLimitContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import AllTools from './pages/AllTools';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

// Core tools
import JpgToPdf from './pages/Tools/JpgToPdf';
import MergePdf from './pages/Tools/MergePdf';
import DeletePdfPages from './pages/Tools/DeletePdfPages';
import PdfToJpg from './pages/Tools/PdfToJpg';
import PdfEditor from './pages/Tools/PdfEditor';
import ImageCompressor from './pages/Tools/ImageCompressor';
import PassportPhoto from './pages/Tools/PassportPhoto';
import DocFormatter from './pages/Tools/DocFormatter';
import ResumeMaker from './pages/Tools/ResumeMaker';
import MarriageBiodata from './pages/Tools/MarriageBiodata';
import ApplicationMaker from './pages/Tools/ApplicationMaker';
import PrintPortal from './pages/Tools/PrintPortal';
import QrGenerator from './pages/Tools/QrGenerator';
import IdCardMaker from './pages/Tools/IdCardMaker';
import PosterMaker from './pages/Tools/PosterMaker';
import ComingSoonTool from './pages/Tools/ComingSoonTool';

// New PDF Conversion Tools
import WordToPdf from './pages/Tools/WordToPdf';

// New Image Resizing/Cropping Tools
import ImageResizer from './pages/Tools/ImageResizer';
import ImageCropper from './pages/Tools/ImageCropper';
import ImageConverter from './pages/Tools/ImageConverter';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ConversionLimitProvider>
          <FavProvider>
            <Router>
            <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-slate-100 transition-colors duration-300">
              
              {/* Global Header */}
              <Header />

              {/* Main Content viewport */}
              <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Routes>
                  {/* Home and Directories */}
                  <Route path="/" element={<Home />} />
                  <Route path="/tools" element={<AllTools />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />

                  {/* Fully implemented Phase 2 tools */}
                  <Route path="/tools/jpg-to-pdf" element={<JpgToPdf />} />
                  <Route path="/tools/png-to-pdf" element={<JpgToPdf />} />
                  <Route path="/tools/merge-pdf" element={<MergePdf />} />
                  <Route path="/tools/delete-pdf-pages" element={<DeletePdfPages />} />
                  <Route path="/tools/pdf-to-jpg" element={<PdfToJpg />} />
                  <Route path="/tools/pdf-editor" element={<PdfEditor />} />
                  <Route path="/tools/edit-pdf" element={<PdfEditor />} />
                  <Route path="/tools/compress-image" element={<ImageCompressor />} />
                  
                  {/* New PDF Conversion Tools */}
                  <Route path="/tools/excel-to-pdf" element={<ComingSoonTool />} />
                  <Route path="/tools/pdf-to-excel" element={<ComingSoonTool />} />
                  <Route path="/tools/word-to-pdf" element={<WordToPdf />} />
                  <Route path="/tools/pdf-to-word" element={<ComingSoonTool />} />
                  <Route path="/tools/ppt-to-pdf" element={<ComingSoonTool />} />
                  <Route path="/tools/pdf-to-ppt" element={<ComingSoonTool />} />

                  {/* Placeholder routes for coming soon tools to guarantee routes exist */}
                  <Route path="/tools/split-pdf" element={<ComingSoonTool />} />
                  <Route path="/tools/rotate-pdf" element={<ComingSoonTool />} />
                  <Route path="/tools/reorder-pdf-pages" element={<ComingSoonTool />} />
                  <Route path="/tools/extract-pdf-pages" element={<ComingSoonTool />} />
                  <Route path="/tools/pdf-to-png" element={<ComingSoonTool />} />
                  <Route path="/tools/compress-pdf" element={<ComingSoonTool />} />
                  
                  <Route path="/tools/jpg-to-png" element={<ImageConverter defaultFrom="jpeg" defaultTo="png" />} />
                  <Route path="/tools/png-to-jpg" element={<ImageConverter defaultFrom="png" defaultTo="jpeg" />} />
                  <Route path="/tools/webp-to-jpg" element={<ImageConverter defaultFrom="webp" defaultTo="jpeg" />} />
                  <Route path="/tools/jpg-to-webp" element={<ImageConverter defaultFrom="jpeg" defaultTo="webp" />} />
                  <Route path="/tools/image-resize" element={<ImageResizer />} />
                  <Route path="/tools/image-crop" element={<ImageCropper />} />
                  <Route path="/tools/image-rotate" element={<ComingSoonTool />} />
                  <Route path="/tools/image-flip" element={<ComingSoonTool />} />

                  <Route path="/tools/passport-photo" element={<PassportPhoto />} />
                  <Route path="/tools/doc-formatter" element={<DocFormatter />} />
                  <Route path="/tools/id-card-maker" element={<IdCardMaker />} />
                  <Route path="/tools/resume-maker" element={<ResumeMaker />} />
                  <Route path="/tools/marriage-biodata" element={<MarriageBiodata />} />
                  <Route path="/tools/application-maker" element={<ApplicationMaker />} />
                  <Route path="/tools/poster-maker" element={<PosterMaker />} />
                  <Route path="/tools/shop-promotion" element={<ComingSoonTool />} />
                  <Route path="/tools/qr-generator" element={<QrGenerator />} />
                  <Route path="/tools/print-portal" element={<PrintPortal />} />
                </Routes>
              </main>

              {/* Global Footer */}
              <Footer />
            </div>
          </Router>
        </FavProvider>
      </ConversionLimitProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
