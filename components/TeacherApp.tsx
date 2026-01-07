
import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import LandingPage from './LandingPage';
import ChatView from './ChatView';
import Sidebar from './Sidebar';
import AcademicManagementPage from './AcademicManagementPage';
import TestsPage from './TestsPage';
import CrmPage from './CrmPage';
import StudyBankPage from './StudyBankPage';
import DashboardPage from './DashboardPage';
import OfficialSummariesPage from './OfficialSummariesPage';
import TrueFlashcardsPage from './TrueFlashcardsPage';
import MarketplaceManagementPage from './MarketplaceManagementPage';
import GamificationManagementPage from './GamificationManagementPage';
import StudyRoomManagementPage from './StudyRoomManagementPage';
import { usePdfParser } from '../hooks/usePdfParser';
import FloatingChatButton from './FloatingChatButton';
import TutorChatModal from './TutorChatModal';
import * as geminiService from '../services/geminiService';
import { useUser } from '../contexts/UserContext';
import { MenuIcon } from './IconComponents';

export type View = 'dashboard' | 'landing' | 'chat' | 'academicManagement' | 'studyBank' | 'tests' | 'crm' | 'officialSummaries' | 'trueFlashcards' | 'marketplace' | 'gamification' | 'studyRooms';

const TeacherApp: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfText, setPdfText] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const { parsePdf, isLoading: isPdfLoading, error: pdfError } = usePdfParser();
    
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    const [currentView, setCurrentView] = useState<View>('dashboard'); 
    const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
    
    // Novo estado para o menu mobile
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Context sync for Tutor AI and Sidebar
    const { setUserRole } = useUser();
    useEffect(() => {
        setUserRole({ role: 'teacher' });
    }, [setUserRole]);

    const handleFileUpload = useCallback(async (file: File) => {
        setImageError(null);
        
        if (file.type === 'application/pdf') {
            const result = await parsePdf(file);
            if (result && result.text) {
                setPdfText(result.text);
                setFileName(file.name);
                setPdfFile(file);
                setCurrentView('chat');
            }
        } else if (file.type.startsWith('image/')) {
            setIsImageLoading(true);
            try {
                const transcribedText = await geminiService.transcribeImage(file);
                if (transcribedText) {
                    setPdfText(transcribedText);
                    setFileName(file.name);
                    setPdfFile(file);
                    setCurrentView('chat');
                } else {
                    setImageError("Não foi possível extrair texto desta imagem.");
                }
            } catch (e) {
                console.error(e);
                setImageError("Erro ao processar imagem com IA.");
            } finally {
                setIsImageLoading(false);
            }
        }
    }, [parsePdf]);

    const handleStartNewSession = () => {
        setPdfFile(null);
        setPdfText(null);
        setFileName('');
        setCurrentView('landing');
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    useEffect(() => {
        if (currentView === 'chat' && (!pdfFile || !pdfText)) {
            setCurrentView('landing');
        }
    }, [currentView, pdfFile, pdfText]);

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <DashboardPage />;
            case 'chat': return (pdfFile && pdfText) ? <ChatView pdfFile={pdfFile} pdfText={pdfText} fileName={fileName} onStartNewSession={handleStartNewSession} /> : null;
            case 'academicManagement': return <AcademicManagementPage />;
            case 'studyBank': return <StudyBankPage />;
            case 'marketplace': return <MarketplaceManagementPage />;
            case 'gamification': return <GamificationManagementPage />;
            case 'studyRooms': return <StudyRoomManagementPage />;
            case 'tests': return <TestsPage />;
            case 'crm': return <CrmPage />;
            case 'officialSummaries': return <OfficialSummariesPage />;
            case 'trueFlashcards': return <TrueFlashcardsPage />;
            case 'landing': default:
                return <LandingPage onPdfUpload={handleFileUpload} isLoading={isPdfLoading || isImageLoading} error={pdfError || imageError} />;
        }
    };
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";

    return (
        <div className="flex h-screen w-screen bg-gray-100 overflow-hidden">
            {/* Sidebar Responsiva */}
            <Sidebar 
                currentView={currentView} 
                setCurrentView={setCurrentView} 
                onLogout={handleLogout}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Mobile (Apenas visível em telas pequenas) */}
                <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-10 flex-shrink-0">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
                    >
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <img src={logoUrl} alt="AprovaMed" className="h-10 w-auto" />
                    <div className="w-8"></div> {/* Spacer para balancear */}
                </header>

                <div className="flex-1 overflow-hidden relative">
                    {renderView()}
                </div>
            </div>

            <FloatingChatButton onClick={() => setIsTutorModalOpen(true)} />
            {isTutorModalOpen && <TutorChatModal onClose={() => setIsTutorModalOpen(false)} />}
        </div>
    );
};

export default TeacherApp;
