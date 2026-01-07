import React, { useState, useEffect } from 'react';
import { StudentContextualPerformance, StudentFlashcardSession } from '../types';
import * as analyticsService from '../services/analyticsService';
import { XIcon, BarChartIcon, LayersIcon, CheckCircleIcon, XCircleIcon } from './IconComponents';
import FlashcardSessionDetailModal from './FlashcardSessionDetailModal';

interface ContextualStudentProfileModalProps {
    studentId: string;
    studentName: string;
    context: {
        level: 'course' | 'module' | 'discipline' | 'class';
        contentId: string;
    };
    onClose: () => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-3">
        <div className="p-2 bg-primary/20 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-px bg-gray-200 w-full my-3"></div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
        </div>
    </div>
);


const ContextualStudentProfileModal: React.FC<ContextualStudentProfileModalProps> = ({
    studentId, studentName, context, onClose
}) => {
    const [performance, setPerformance] = useState<StudentContextualPerformance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingSession, setViewingSession] = useState<StudentFlashcardSession | null>(null);

    useEffect(() => {
        const fetchPerformance = async () => {
            setIsLoading(true);
            const data = await analyticsService.getStudentPerformanceInContext(studentId, context);
            setPerformance(data);
            setIsLoading(false);
        };
        fetchPerformance();
    }, [studentId, context]);
    
    return (
         <>
            <div className="fixed inset-0 bg-black/10 z-[60]" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-start justify-between">
                        <div>
                             <p className="text-xs font-semibold text-primary uppercase">Desempenho do Aluno</p>
                            <h2 className="text-xl font-bold text-gray-800">{studentName}</h2>
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
                    ) : performance ? (
                         <div className="p-6">
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <StatCard title="Média (Testes)" value={`${performance.studentTestAverage}%`} icon={BarChartIcon} />
                                <StatCard title="Precisão (Cards)" value={`${performance.studentFlashcardAccuracy}%`} icon={LayersIcon} />
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Testes Realizados</h3>
                                    {performance.testAttempts.length > 0 ? (
                                        <div className="space-y-2">
                                            {performance.testAttempts.map(attempt => (
                                                <div key={attempt.id} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{attempt.tests?.name || 'Teste sem nome'}</p>
                                                        <p className="text-xs text-gray-500">Realizado em: {new Date(attempt.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <p className={`text-lg font-bold ${attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {attempt.score}%
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-gray-500">Nenhum teste realizado por este aluno neste contexto.</p>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Sessões de Flashcard</h3>
                                    {performance.flashcardSessions.length > 0 ? (
                                        <div className="space-y-2">
                                            {performance.flashcardSessions.map(session => (
                                                 <button 
                                                    key={session.id} 
                                                    className="w-full text-left bg-gray-50 p-3 rounded-lg border hover:bg-primary/10 hover:border-primary transition-colors"
                                                    onClick={() => setViewingSession(session)}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <p className="font-semibold text-gray-800">{session.question_sets?.subject_name || 'Assunto desconhecido'}</p>
                                                         {session.status === 'in_progress' && (
                                                            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Em andamento</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">
                                                         {session.status === 'completed' ? 'Concluído em' : 'Iniciado em'}: {new Date(session.completed_at || session.created_at).toLocaleString()}
                                                    </p>
                                                    <div className="mt-2 flex items-center gap-4 text-xs">
                                                        <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircleIcon className="w-4 h-4" /> {session.correct_answers} Acertos</span>
                                                        <span className="flex items-center gap-1 text-red-600 font-medium"><XCircleIcon className="w-4 h-4" /> {session.incorrect_answers} Erros</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                         <div className="text-center py-4">
                                            <p className="text-sm text-gray-500">Nenhuma sessão de flashcard registrada neste contexto.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                         </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">Não foi possível carregar os dados de desempenho.</p>
                        </div>
                    )}
                </main>
            </div>
            {viewingSession && (
                <FlashcardSessionDetailModal
                    session={viewingSession}
                    onClose={() => setViewingSession(null)}
                />
            )}
        </>
    );
};

export default ContextualStudentProfileModal;