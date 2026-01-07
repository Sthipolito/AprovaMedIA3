
import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SendIcon, BotIcon, UserIcon, BarChartIcon, SparklesIcon } from './IconComponents';
import { useUser } from '../contexts/UserContext';
import * as tutorService from '../services/tutorService';
import { ChatMessage } from '../types';

interface TutorChatModalProps {
    onClose: () => void;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
    </div>
);

const TutorChatModal: React.FC<TutorChatModalProps> = ({ onClose }) => {
    const { userRole } = useUser();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initialMsg = tutorService.getInitialTutorMessage(userRole);
        setMessages([{ role: 'model', content: initialMsg }]);
    }, [userRole]);

    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [messages]);

    const handleSendMessage = async (forceContext: boolean = false) => {
        if ((!userInput.trim() && !forceContext) || isLoading) return;

        const question = forceContext ? "Pode analisar meu desempenho atual e me dar um diagnóstico estratégico?" : userInput;
        
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
        setMessages(newMessages);
        setUserInput('');
        setIsLoading(true);
        if (forceContext) setIsAnalyzing(true);

        try {
            // Converte ChatMessage[] para o formato simples que o serviço espera
            const historyForAi = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await tutorService.getTutorResponse(question, userRole, historyForAi, forceContext);
            setMessages(prev => [...prev, { role: 'model', content: response }]);
        } finally {
            setIsLoading(false);
            setIsAnalyzing(false);
        }
    };

    const roleName = userRole.role === 'teacher' ? 'Professor' : userRole.studentName;

    return (
        <div className="fixed inset-0 bg-black/30 flex items-end justify-end z-40 p-0 sm:p-6" onClick={onClose}>
            <div 
                className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full h-full sm:w-[440px] sm:max-h-[700px] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0 shadow-sm relative z-10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Tutor IA
                            </h2>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Modo Econômico Ativo</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </header>

                {/* Chat Content */}
                <div ref={chatContainerRef} className="flex-grow p-4 space-y-6 overflow-y-auto bg-gray-50 custom-scrollbar">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role !== 'user' && (
                                <div className="w-8 h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                                    <BotIcon className="w-5 h-5 text-primary"/>
                                </div>
                            )}
                            <div className={`max-w-[85%] p-3 rounded-xl text-sm shadow-sm ${
                                msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 
                                'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center border border-gray-300">
                                    <UserIcon className="w-5 h-5 text-gray-600"/>
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                                <BotIcon className="w-5 h-5 text-primary"/>
                            </div>
                            <div className="max-w-[85%] p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                <div className="flex flex-col gap-2">
                                    {isAnalyzing && <p className="text-[10px] font-bold text-primary animate-pulse uppercase">Lendo dados do dashboard...</p>}
                                    <LoadingIndicator />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input & Action Footer */}
                <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Botão de Contexto Sob Demanda */}
                    <button 
                        onClick={() => handleSendMessage(true)}
                        disabled={isLoading}
                        className="w-full mb-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                        <BarChartIcon className="w-4 h-4"/>
                        {userRole.role === 'teacher' ? 'Analisar Desempenho da Turma' : 'Analisar Meu Desempenho'}
                    </button>

                    <div className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(false)}
                            placeholder="Tire uma dúvida rápida..."
                            className="flex-grow p-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-gray-50 text-sm"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => handleSendMessage(false)}
                            disabled={isLoading || !userInput.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary rounded-lg text-white hover:bg-primary-dark transition-colors disabled:bg-gray-300 shadow-sm"
                        >
                            <SendIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[10px] text-center text-gray-400 mt-2">Dica: Perguntas rápidas economizam tokens. Use o botão acima apenas para relatórios.</p>
                </div>
            </div>
        </div>
    );
};

export default TutorChatModal;
