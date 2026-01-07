import React, { useState, useEffect } from 'react';
import { ContentAnalyticsData } from '../types';
import * as analyticsService from '../services/analyticsService';
import { XIcon, UsersIcon, ClipboardListIcon, BarChartIcon, LayersIcon, ActivityIcon, CheckCircleIcon, XCircleIcon } from './IconComponents';
import ContextualStudentProfileModal from './ContextualStudentProfileModal';

interface ContentDetailModalProps {
    level: 'course' | 'module' | 'discipline' | 'class';
    contentId: string;
    contentName: string;
    onClose: () => void;
}

type Tab = 'overview' | 'students' | 'tests' | 'flashcards';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-gray-100 p-4 rounded-lg flex items-center gap-4">
        <div className="p-2 bg-primary/20 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-3 animate-pulse p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="h-px bg-gray-200 w-full my-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
            <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
    </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center py-10">
        <p className="text-gray-500">{message}</p>
    </div>
);

const ContentDetailModal: React.FC<ContentDetailModalProps> = ({ level, contentId, contentName, onClose }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [analytics, setAnalytics] = useState<ContentAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingStudentContext, setViewingStudentContext] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            const data = await analyticsService.getContentAnalytics(level, contentId);
            setAnalytics(data);
            setIsLoading(false);
        };
        fetchAnalytics();
    }, [level, contentId]);

    const renderTabContent = () => {
        if (!analytics) return <EmptyState message="Não foi possível carregar os dados de análise." />;

        switch (activeTab) {
            case 'students':
                return (
                    <div>
                        <div className="flex text-xs font-semibold text-gray-500 px-3 py-2">
                            <p className="w-1/2">Aluno</p>
                            <p className="w-1/4 text-center">Média (Testes)</p>
                            <p className="w-1/4 text-center">Precisão (Cards)</p>
                        </div>
                        {analytics.students.length > 0 ? (
                            <div className="space-y-2">
                                {analytics.students.map(student => (
                                    <button
                                        key={student.id}
                                        onClick={() => setViewingStudentContext({ id: student.id, name: student.name })}
                                        className="w-full text-left bg-gray-50 p-3 rounded-lg border flex justify-between items-center hover:bg-primary/10 hover:border-primary/50 transition-colors"
                                    >
                                        <p className="font-semibold text-gray-800 w-1/2 truncate">{student.name}</p>
                                        <p className={`w-1/4 text-center font-bold ${student.testAverage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                            {student.testAverage > 0 ? `${student.testAverage}%` : '--'}
                                        </p>
                                        <p className={`w-1/4 text-center font-bold ${student.flashcardAccuracy >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                            {student.flashcardAccuracy > 0 ? `${student.flashcardAccuracy}%` : '--'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        ) : <EmptyState message="Nenhum aluno encontrado neste contexto." />}
                    </div>
                );
            case 'tests':
                 return (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Desempenho por Teste</h3>
                        {analytics.tests.length > 0 ? (
                             <div className="space-y-2">
                                {analytics.tests.map(test => (
                                    <div key={test.id} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                                        <p className="font-semibold text-gray-800">{test.name}</p>
                                        <p className={`text-lg font-bold ${test.average >= 70 ? 'text-green-600' : test.average > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                            {test.average > 0 ? `${test.average}%` : 'N/A'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : <EmptyState message="Nenhum teste encontrado neste contexto." />}
                    </div>
                );
            case 'flashcards':
                return (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Sessões de Flashcard Recentes</h3>
                        {analytics.flashcardSessions.length > 0 ? (
                            <div className="space-y-2">
                                {analytics.flashcardSessions.map(session => (
                                    <button key={session.id} onClick={() => setViewingStudentContext({ id: session.student_id, name: session.students?.name || 'Aluno' })} className="w-full text-left bg-gray-50 p-3 rounded-lg border hover:bg-primary/10 hover:border-primary transition-colors">
                                        <p className="font-semibold text-gray-800">{session.question_sets?.subject_name}</p>
                                        <p className="text-sm text-gray-600">por {session.students?.name}</p>
                                        <div className="mt-2 flex items-center gap-4 text-xs">
                                            <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircleIcon className="w-4 h-4" /> {session.correct_answers}</span>
                                            <span className="flex items-center gap-1 text-red-600 font-medium"><XCircleIcon className="w-4 h-4" /> {session.incorrect_answers}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : <EmptyState message="Nenhuma sessão de flashcard encontrada neste contexto." />}
                    </div>
                );
            case 'overview':
            default:
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Ações Recentes</h3>
                            {analytics.activityLog.length > 0 ? (
                                <ul className="space-y-3">
                                    {analytics.activityLog.map(activity => (
                                        <li key={activity.id} className="flex items-start gap-3">
                                            <div className="mt-1 p-1.5 bg-primary/20 rounded-full"><ActivityIcon className="w-4 h-4 text-primary" /></div>
                                            <div>
                                                <p className="text-sm text-gray-800">
                                                    <span className="font-semibold">{activity.students?.name || 'Aluno'}</span> {activity.description.toLowerCase().replace(/^iniciou a sessão...|^respondeu à questão.../i, (match) => match.charAt(0).toLowerCase() + match.slice(1))}
                                                </p>
                                                <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : <EmptyState message="Nenhuma atividade recente encontrada." />}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Desempenho por Aluno</h3>
                            {analytics.students.length > 0 ? (
                                <div className="space-y-2">
                                    {analytics.students.slice(0, 3).map(student => (
                                         <button key={student.id} onClick={() => setViewingStudentContext({ id: student.id, name: student.name })} className="w-full text-left bg-gray-50 p-3 rounded-lg border flex justify-between items-center hover:bg-primary/10 hover:border-primary/50 transition-colors">
                                            <p className="font-semibold text-gray-800">{student.name}</p>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Testes</p>
                                                    <p className={`font-bold ${student.testAverage >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {student.testAverage > 0 ? `${student.testAverage}%` : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Cards</p>
                                                    <p className={`font-bold ${student.flashcardAccuracy >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {student.flashcardAccuracy > 0 ? `${student.flashcardAccuracy}%` : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : <EmptyState message="Nenhum aluno encontrado." />}
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${viewingStudentContext ? '-translate-x-16 opacity-50' : 'translate-x-0'}`}>
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                             <p className="text-xs font-semibold text-primary uppercase">{level}</p>
                            <h2 className="text-xl font-bold text-gray-800">{contentName}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                            <XIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                    {!isLoading && analytics && (
                        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard title="Alunos" value={analytics.studentCount.toString()} icon={UsersIcon} />
                            <StatCard title="Testes" value={analytics.testCount.toString()} icon={ClipboardListIcon} />
                            <StatCard title="Média (Testes)" value={`${analytics.averageScore}%`} icon={BarChartIcon} />
                            <StatCard title="Precisão (Cards)" value={`${analytics.averageFlashcardAccuracy}%`} icon={LayersIcon} />
                        </div>
                    )}
                </header>
                
                <nav className="border-b flex-shrink-0">
                    <button onClick={() => setActiveTab('overview')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'overview' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Visão Geral</button>
                    <button onClick={() => setActiveTab('students')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'students' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Alunos</button>
                    <button onClick={() => setActiveTab('tests')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'tests' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Testes</button>
                    <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'flashcards' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Flashcards</button>
                </nav>

                <main className="flex-grow p-6 overflow-y-auto">
                    {isLoading ? <LoadingSkeleton /> : renderTabContent()}
                </main>
            </div>

            {viewingStudentContext && (
                <ContextualStudentProfileModal
                    studentId={viewingStudentContext.id}
                    studentName={viewingStudentContext.name}
                    context={{ level, contentId }}
                    onClose={() => setViewingStudentContext(null)}
                />
            )}
        </>
    );
};

export default ContentDetailModal;