
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './Header';
import { QuizQuestion } from '../types';
import { extractQuestionsFromPdf } from '../services/geminiService';
import { saveQuestionSet, appendQuestionsToSet } from '../services/questionBankService';
import * as testService from '../services/testService';
import { FileTextIcon, LayersIcon, SparklesIcon, LayoutGridIcon } from './IconComponents';
import PdfViewer from './PdfViewer';
import QuestionBankView from './QuestionBankView';
import FlashcardModal from './FlashcardModal';
import SaveQuestionsModal from './SaveQuestionsModal';
import AnswerKeyProcessorTab from './AnswerKeyProcessorTab';
import SummaryGeneratorTab from './SummaryGeneratorTab';
import FlashcardGeneratorTab from './FlashcardGeneratorTab';

interface ChatViewProps {
    pdfFile: File;
    pdfText: string;
    fileName: string;
    onStartNewSession: () => void;
}

const ADMIN_TEST_USER_ID = "00000000-0000-0000-0000-000000000000"; 

const ChatView: React.FC<ChatViewProps> = ({ pdfFile, pdfText, fileName, onStartNewSession }) => {
    // Removed Chat States (messages, userInput, loading, suggestedQuestions)
    
    // Default to 'questions' since chat is gone
    const [activeTab, setActiveTab] = useState<'questions' | 'answers' | 'summary' | 'flashcards'>('questions');
    
    const [questionBank, setQuestionBank] = useState<QuizQuestion[] | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<Set<number>>(new Set());
    
    // Mobile View State: 'tools' (default) or 'pdf'
    const [mobileViewMode, setMobileViewMode] = useState<'tools' | 'pdf'>('tools');
    
    const selectedQuestions = useMemo(() => {
        if (!questionBank) return [];
        return Array.from(selectedQuestionIndices).map(index => questionBank[index]);
    }, [questionBank, selectedQuestionIndices]);
    
    useEffect(() => {
        setSelectedQuestionIndices(new Set());
    }, [questionBank]);

    
    const handleExtractQuestions = async () => {
        setIsExtracting(true);
        setQuestionBank(null);
        const extracted = await extractQuestionsFromPdf(pdfText);
        setQuestionBank(extracted);
        setIsExtracting(false);
        setActiveTab('questions');
    };
    
    const handleSelectionChange = (index: number) => {
        const newSelection = new Set(selectedQuestionIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedQuestionIndices(newSelection);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && questionBank) {
            const allIndices = new Set(questionBank.map((_, i) => i));
            setSelectedQuestionIndices(allIndices);
        } else {
            setSelectedQuestionIndices(new Set());
        }
    };


    const handleSaveQuestions = async (details: { disciplineId: string; subjectName: string; createTest: boolean; testName: string; existingSetId?: string; }) => {
        if (selectedQuestions.length > 0) {
            try {
                let success = false;
                
                if (details.existingSetId) {
                    success = await appendQuestionsToSet(details.existingSetId, selectedQuestions);
                } else {
                    const savedSet = await saveQuestionSet(details.disciplineId, details.subjectName, selectedQuestions);
                    success = !!savedSet;
                }
                
                if (success) {
                    let alertMessage = `Sucesso! ${selectedQuestions.length} questões salvas em "${details.subjectName}".`;

                    if (details.createTest && details.testName) {
                        const newTest = await testService.createTest(details.testName, selectedQuestions, 'fixed', { disciplineId: details.disciplineId });
                        if (newTest) {
                            alertMessage += `\n\nTeste "${newTest.name}" também foi criado com sucesso!`;
                        } else {
                            alertMessage += "\n\nFalha ao criar o teste automaticamente.";
                        }
                    }
                    alert(alertMessage);
                } else {
                    throw new Error("O servidor não retornou confirmação.");
                }
            } catch (error: any) {
                 console.error("Erro ao salvar:", error);
                 alert(`Erro ao salvar questões: ${error.message || "Verifique sua conexão ou permissões."}`);
            }
        }
        setShowSaveModal(false);
    };
    
    const TabButton: React.FC<{ tabName: typeof activeTab; children: React.ReactNode }> = ({ tabName, children }) => (
         <button
            onClick={() => setActiveTab(tabName)}
            className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === tabName ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
            {children}
        </button>
    );

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-100 relative">
                <Header onStartNewSession={onStartNewSession} fileName={fileName} />
                
                {/* Mobile Toggle Switches */}
                <div className="md:hidden flex border-b border-gray-200 bg-white">
                    <button 
                        onClick={() => setMobileViewMode('tools')}
                        className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${mobileViewMode === 'tools' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                    >
                        <LayoutGridIcon className="w-4 h-4"/> Painel de Criação
                    </button>
                    <button 
                        onClick={() => setMobileViewMode('pdf')}
                        className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${mobileViewMode === 'pdf' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                    >
                        <FileTextIcon className="w-4 h-4"/> Documento Original
                    </button>
                </div>

                <main className="flex-grow flex flex-col md:flex-row h-full overflow-hidden relative">
                    
                    {/* PDF Viewer - Visible on Desktop OR Mobile if mode is 'pdf' */}
                    <div className={`${mobileViewMode === 'pdf' ? 'flex' : 'hidden'} md:flex md:w-1/2 h-full bg-gray-200 relative`}>
                        <PdfViewer file={pdfFile} />
                    </div>

                    {/* Interaction Panel - Visible on Desktop OR Mobile if mode is 'tools' */}
                    <div className={`${mobileViewMode === 'tools' ? 'flex' : 'hidden'} md:flex w-full md:w-1/2 flex-col bg-white h-full border-l border-gray-200`}>
                        <div className="border-b border-gray-200 overflow-x-auto custom-scrollbar">
                            <nav className="flex -mb-px min-w-max px-2">
                                <TabButton tabName="questions">Extrair Questões</TabButton>
                                <TabButton tabName="answers">Processar Gabarito</TabButton>
                                <TabButton tabName="summary">Gerar Resumo</TabButton>
                                <TabButton tabName="flashcards">Criar Flashcards</TabButton>
                            </nav>
                        </div>

                        {/* Content Area - No Chat Logic Here */}
                        <div className="flex-grow overflow-hidden flex flex-col bg-gray-50">
                            {activeTab === 'questions' && (
                                <QuestionBankView 
                                    questions={questionBank}
                                    isExtracting={isExtracting}
                                    onExtract={handleExtractQuestions}
                                    onStudy={() => setShowFlashcards(true)}
                                    onSave={() => setShowSaveModal(true)}
                                    selectedIndices={selectedQuestionIndices}
                                    onSelectionChange={handleSelectionChange}
                                    onSelectAll={handleSelectAll}
                                />
                            )}
                            {activeTab === 'answers' && <AnswerKeyProcessorTab questions={questionBank} onQuestionsUpdate={setQuestionBank} />}
                            {activeTab === 'summary' && <SummaryGeneratorTab pdfText={pdfText} />}
                            {activeTab === 'flashcards' && <FlashcardGeneratorTab pdfText={pdfText} />}
                        </div>
                    </div>
                </main>
            </div>
            {showFlashcards && selectedQuestions.length > 0 && (
                <FlashcardModal 
                    studentId={ADMIN_TEST_USER_ID}
                    questionSet={{
                        id: 'chat-session-set',
                        subjectName: `Questões de ${fileName}`,
                        questions: selectedQuestions
                    }}
                    onClose={() => setShowFlashcards(false)}
                />
            )}
            {showSaveModal && selectedQuestions.length > 0 && (
                <SaveQuestionsModal 
                    onClose={() => setShowSaveModal(false)}
                    onSave={handleSaveQuestions}
                />
            )}
        </>
    );
};

export default ChatView;
