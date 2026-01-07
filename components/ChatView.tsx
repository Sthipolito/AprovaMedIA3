import React, { useState, useRef, useEffect, useMemo } from 'react';
import Header from './Header';
import { ChatMessage, QuizQuestion } from '../types';
import { answerQuestion, extractQuestionsFromPdf } from '../services/geminiService';
import { saveQuestionSet, appendQuestionsToSet } from '../services/questionBankService';
import * as testService from '../services/testService';
import { SendIcon, UserIcon, BotIcon, FileTextIcon, MessageSquareIcon } from './IconComponents';
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

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const ADMIN_TEST_USER_ID = "00000000-0000-0000-0000-000000000000"; 

const ChatView: React.FC<ChatViewProps> = ({ pdfFile, pdfText, fileName, onStartNewSession }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'system', content: `Olá! Analisei "${fileName}". Pergunte-me qualquer coisa ou use as ferramentas de IA.` }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [questionBank, setQuestionBank] = useState<QuizQuestion[] | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'questions' | 'answers' | 'summary' | 'flashcards'>('chat');
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<Set<number>>(new Set());
    
    // Mobile View State: 'chat' (default) or 'pdf'
    const [mobileViewMode, setMobileViewMode] = useState<'chat' | 'pdf'>('chat');
    
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const selectedQuestions = useMemo(() => {
        if (!questionBank) return [];
        return Array.from(selectedQuestionIndices).map(index => questionBank[index]);
    }, [questionBank, selectedQuestionIndices]);

    useEffect(() => {
        if (activeTab === 'chat' && mobileViewMode === 'chat') {
            chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
        }
    }, [messages, activeTab, mobileViewMode]);
    
    useEffect(() => {
        setSelectedQuestionIndices(new Set());
    }, [questionBank]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);

        const response = await answerQuestion(pdfText, userInput);

        setMessages([...newMessages, { role: 'model', content: response }]);
        setIsLoading(false);
    };
    
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
                        onClick={() => setMobileViewMode('chat')}
                        className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${mobileViewMode === 'chat' ? 'bg-primary/5 text-primary border-b-2 border-primary' : 'text-gray-500'}`}
                    >
                        <MessageSquareIcon className="w-4 h-4"/> Chat & Ferramentas
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

                    {/* Interaction Panel - Visible on Desktop OR Mobile if mode is 'chat' */}
                    <div className={`${mobileViewMode === 'chat' ? 'flex' : 'hidden'} md:flex w-full md:w-1/2 flex-col bg-white h-full border-l border-gray-200`}>
                        <div className="border-b border-gray-200 overflow-x-auto custom-scrollbar">
                            <nav className="flex -mb-px min-w-max px-2">
                                <TabButton tabName="chat">Chat</TabButton>
                                <TabButton tabName="questions">Questões</TabButton>
                                <TabButton tabName="answers">Gabarito</TabButton>
                                <TabButton tabName="summary">Resumo</TabButton>
                                <TabButton tabName="flashcards">Flashcards</TabButton>
                            </nav>
                        </div>

                        {activeTab === 'chat' && (
                            <>
                                <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-50">
                                    {messages.map((msg, index) => (
                                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                            {msg.role !== 'user' && (
                                                <div className="w-8 h-8 flex-shrink-0 bg-primary rounded-full flex items-center justify-center text-white shadow-sm">
                                                    <BotIcon className="w-5 h-5"/>
                                                </div>
                                            )}
                                            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                                                msg.role === 'user' 
                                                ? 'bg-primary text-white rounded-br-none' 
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                            }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                            {msg.role === 'user' && (
                                                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                                                    <UserIcon className="w-5 h-5"/>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 flex-shrink-0 bg-primary rounded-full flex items-center justify-center text-white">
                                                <BotIcon className="w-5 h-5"/>
                                            </div>
                                            <div className="p-3 bg-white border border-gray-100 rounded-2xl rounded-bl-none shadow-sm">
                                                <LoadingIndicator />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-gray-200 bg-white sticky bottom-0">
                                    <div className="relative flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={userInput}
                                            onChange={(e) => setUserInput(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Pergunte sobre o documento..."
                                            className="flex-grow p-3 pr-12 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:outline-none bg-gray-50 text-gray-800 placeholder:text-gray-400 text-sm"
                                            disabled={isLoading}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={isLoading || !userInput.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-full text-white hover:bg-primary-dark transition-colors disabled:bg-gray-300 shadow-md"
                                        >
                                            <SendIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
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