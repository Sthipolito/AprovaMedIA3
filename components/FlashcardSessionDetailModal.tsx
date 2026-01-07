
import React, { useState, useEffect } from 'react';
import { StudentFlashcardSession, FlashcardResponse, QuizQuestion } from '../types';
import * as crmService from '../services/crmService';
// FIX: Removed HelpCircleIcon as it does not exist in IconComponents and was unused.
import { XIcon, CheckCircleIcon, XCircleIcon, LightbulbIcon } from './IconComponents';

interface FlashcardSessionDetailModalProps {
    session: StudentFlashcardSession;
    onClose: () => void;
}

const LoadingSkeleton: React.FC = () => (
    <div className="p-6 space-y-4 animate-pulse">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
    </div>
);

const QuestionResult: React.FC<{
    question: QuizQuestion;
    response: FlashcardResponse | undefined;
    index: number;
}> = ({ question, response, index }) => {
    
    const getResultIcon = () => {
        if (!response) {
            return <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" title="Não respondida"></div>;
        }
        if (response.was_correct) {
            return (
                <div className="flex-shrink-0" title="Correto">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                </div>
            );
        }
        return (
            <div className="flex-shrink-0" title="Incorreto">
                <XCircleIcon className="w-5 h-5 text-red-500" />
            </div>
        );
    };

    return (
        <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="flex items-start gap-3">
                {getResultIcon()}
                <p className="font-semibold text-gray-700 flex-grow">{index + 1}. {question.question}</p>
                {response?.used_ai_hint && (
                    <div title="Dica da IA usada">
                        <LightbulbIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    </div>
                )}
            </div>
        </div>
    );
};

const FlashcardSessionDetailModal: React.FC<FlashcardSessionDetailModalProps> = ({ session, onClose }) => {
    const [responses, setResponses] = useState<FlashcardResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchResponses = async () => {
            setIsLoading(true);
            const responseData = await crmService.getFlashcardResponsesForSession(session.id);
            setResponses(responseData);
            setIsLoading(false);
        };
        fetchResponses();
    }, [session.id]);
    
    const questions = session.question_sets?.questions || [];
    
    return (
        <>
            <div className="fixed inset-0 bg-black/10 z-[60]" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-primary uppercase">Detalhes da Sessão</p>
                            <h2 className="text-xl font-bold text-gray-800">{session.question_sets?.subject_name || 'Sessão de Estudo'}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-grow overflow-y-auto">
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : (
                        <div className="p-6">
                             <div className="mb-6 flex items-center justify-around text-center bg-gray-100 p-3 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500">Acertos</p>
                                    <p className="text-lg font-bold text-green-600">{session.correct_answers}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-gray-500">Erros</p>
                                    <p className="text-lg font-bold text-red-600">{session.incorrect_answers}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Dicas Usadas</p>
                                    <p className="text-lg font-bold text-yellow-600">{session.hints_used}</p>
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Resumo das Respostas</h3>
                            {questions.length > 0 ? (
                                <div className="space-y-2">
                                    {questions.map((q, index) => (
                                        <QuestionResult
                                            key={index}
                                            question={q}
                                            response={responses.find(r => r.question_index === index)}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">Nenhuma questão encontrada neste conjunto de estudo.</p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default FlashcardSessionDetailModal;