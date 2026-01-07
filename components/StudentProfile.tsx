import React, { useState, useEffect } from 'react';
import { Student, StudentTestAttempt, StudentActivityLog, StudentFlashcardSession, StudentAnalytics, StudentAvailableTest } from '../types';
import * as crmService from '../services/crmService';
import * as analyticsService from '../services/analyticsService';
import * as testService from '../services/testService';
import { XIcon, ClipboardListIcon, BarChartIcon, ActivityIcon, LayersIcon, EditIcon, TrashIcon, TrendingUpIcon, TrendingDownIcon, CalendarIcon, CheckCircleIcon } from './IconComponents';
import FlashcardSessionDetailModal from './FlashcardSessionDetailModal';
import TestSessionModal from './TestSessionModal'; // Import the new modal

interface StudentProfileProps {
    student: Student;
    onClose: () => void;
    onEditRequest: (student: Student) => void;
    onDeleteRequest: (studentId: string) => void;
}

type Tab = 'analysis' | 'tests' | 'flashcards' | 'details';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
            <p className="text-xs font-semibold text-gray-500">{title}</p>
            <p className="text-lg font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded-full w-3/4"></div>
        <div className="h-16 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
    </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center py-10">
        <p className="text-gray-500">{message}</p>
    </div>
);


const StudentProfile: React.FC<StudentProfileProps> = ({ student, onClose, onEditRequest, onDeleteRequest }) => {
    const [activeTab, setActiveTab] = useState<Tab>('analysis');
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [availableTests, setAvailableTests] = useState<StudentAvailableTest[]>([]);
    const [flashcardSessions, setFlashcardSessions] = useState<StudentFlashcardSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingSession, setViewingSession] = useState<StudentFlashcardSession | null>(null);
    const [takingTest, setTakingTest] = useState<StudentAvailableTest | null>(null); // State for the test session

    const fetchData = async () => {
        if (!student) return;
        setIsLoading(true);
        const [analyticsData, availableTestsData, flashcardData] = await Promise.all([
            analyticsService.getStudentComprehensiveAnalytics(student.id),
            testService.getStudentAvailableTests(student.id),
            crmService.getStudentFlashcardSessions(student.id)
        ]);
        setAnalytics(analyticsData);
        setAvailableTests(availableTestsData);
        setFlashcardSessions(flashcardData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [student]);

    const renderTabContent = () => {
        if (isLoading) {
            return <LoadingSkeleton />;
        }
        
        switch (activeTab) {
            case 'analysis':
                if (!analytics) return <EmptyState message="Não foi possível carregar os dados de análise do aluno." />;
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Progresso Geral no Curso</h3>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="bg-primary h-4 rounded-full transition-all duration-500 flex items-center justify-center" style={{ width: `${analytics.overallProgress}%` }}>
                                   <span className="text-xs font-bold text-white">{analytics.overallProgress}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard title="Média (Testes)" value={`${analytics.testAverage}%`} icon={BarChartIcon} />
                            <StatCard title="Precisão (Cards)" value={`${analytics.flashcardAccuracy}%`} icon={LayersIcon} />
                            <StatCard title="Dias de Estudo" value={`${analytics.studyDays}`} icon={CalendarIcon} />
                            <StatCard title="Sessões Iniciadas" value={`${analytics.totalSessions}`} icon={ActivityIcon} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-green-500"/> Pontos Fortes</h3>
                                <div className="space-y-2">
                                    {analytics.strengths.length > 0 ? analytics.strengths.map(s => (
                                        <div key={s.questionSetId} className="bg-green-50 p-3 rounded-lg border border-green-200">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-sm text-green-800">{s.subjectName}</p>
                                                <p className="font-bold text-green-700">{s.accuracy}%</p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{s.disciplineName}</p>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 italic">Dados insuficientes.</p>}
                                </div>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingDownIcon className="w-5 h-5 text-orange-500"/> Pontos Fracos</h3>
                                <div className="space-y-2">
                                     {analytics.weaknesses.length > 0 ? analytics.weaknesses.map(w => (
                                        <div key={w.questionSetId} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-sm text-orange-800">{w.subjectName}</p>
                                                <p className="font-bold text-orange-700">{w.accuracy}%</p>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{w.disciplineName}</p>
                                        </div>
                                    )) : <p className="text-sm text-gray-500 italic">Nenhum ponto fraco identificado!</p>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Atividade Recente</h3>
                            {analytics.recentActivity.length > 0 ? (
                                <ul className="space-y-3">
                                    {analytics.recentActivity.map(activity => (
                                        <li key={activity.id} className="flex items-start gap-3">
                                            <div className="mt-1 p-1.5 bg-primary/10 rounded-full"><ActivityIcon className="w-4 h-4 text-primary" /></div>
                                            <div>
                                                <p className="text-sm text-gray-800">{activity.description}</p>
                                                <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <EmptyState message="Nenhuma atividade recente registrada." />
                            )}
                        </div>
                    </div>
                );
            case 'tests':
                const totalTestQuestionsAvailable = availableTests.reduce((sum, test) => sum + (test.questions?.length || 0), 0);
                const completedAttempts = availableTests.flatMap(test => test.attempts.filter(a => a.status === 'completed'));
                const completedTestIds = new Set(completedAttempts.map(a => a.test_id));
                const totalTestQuestionsCompleted = availableTests
                    .filter(test => completedTestIds.has(test.id))
                    .reduce((sum, test) => sum + (test.questions?.length || 0), 0);
                const overallTestProgress = totalTestQuestionsAvailable > 0
                    ? Math.round((totalTestQuestionsCompleted / totalTestQuestionsAvailable) * 100)
                    : 0;

                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Progresso Geral em Testes</h3>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="bg-primary h-4 rounded-full transition-all duration-500 flex items-center justify-center" style={{ width: `${overallTestProgress}%` }}>
                                   <span className="text-xs font-bold text-white">{overallTestProgress}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                        {availableTests.length > 0 ? availableTests.map(test => {
                            const isScheduled = test.test_type === 'scheduled';
                            const assignment = isScheduled && test.assignments && test.assignments.length > 0 ? test.assignments[0] : null;
                            const hasCompletedAttempt = test.attempts.some(a => a.status === 'completed');
                            
                            let isAvailable = test.test_type === 'fixed';
                            let statusText = 'Disponível para estudo';
                            let statusColor = 'bg-blue-100 text-blue-800';
                            
                            if (hasCompletedAttempt) {
                                statusText = 'Concluído';
                                statusColor = 'bg-green-100 text-green-800';
                            } else if (isScheduled && assignment) {
                                const now = new Date();
                                const start = new Date(assignment.start_time);
                                const end = new Date(assignment.end_time);
                                isAvailable = now >= start && now <= end;
                                if (now < start) {
                                    statusText = `Agendado para ${start.toLocaleDateString()}`;
                                    statusColor = 'bg-purple-100 text-purple-800';
                                }
                                else if (now > end) {
                                    statusText = 'Encerrado';
                                    statusColor = 'bg-gray-100 text-gray-800';
                                    isAvailable = false;
                                }
                                else {
                                    statusText = 'Em andamento';
                                    statusColor = 'bg-yellow-100 text-yellow-800';
                                }
                            }

                            return (
                                <div key={test.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800">{test.name}</p>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                                                {statusText}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setTakingTest(test)} 
                                            disabled={!isAvailable}
                                            className="px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            Fazer Teste
                                        </button>
                                    </div>
                                    {test.attempts.length > 0 ? (
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-xs font-semibold text-gray-500 mb-1">Tentativas Anteriores:</p>
                                            {test.attempts.map(attempt => (
                                                <div key={attempt.id} className="text-sm flex justify-between items-center py-1">
                                                    <span className="text-gray-500">Tentativa em: {new Date(attempt.created_at).toLocaleString()}</span>
                                                    <span className={`font-bold ${attempt.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{attempt.score}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic mt-2">Nenhuma tentativa realizada.</p>
                                    )}
                                </div>
                            );
                        }) : (
                            <EmptyState message="Nenhum teste disponível ou realizado por este aluno." />
                        )}
                        </div>
                    </div>
                );
            case 'flashcards':
                if (!flashcardSessions || flashcardSessions.length === 0) {
                    return <EmptyState message="Nenhuma sessão de flashcards foi iniciada." />;
                }

                const overallStats = flashcardSessions.reduce((acc, session) => {
                    const answered = (session.correct_answers || 0) + (session.incorrect_answers || 0);
                    const total = session.question_sets?.questions?.length || 0;
                    acc.totalAnswered += answered;
                    acc.totalQuestions += total;
                    return acc;
                }, { totalAnswered: 0, totalQuestions: 0 });

                const overallProgress = overallStats.totalQuestions > 0 
                    ? Math.round((overallStats.totalAnswered / overallStats.totalQuestions) * 100) 
                    : 0;

                return (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Progresso Geral em Flashcards</h3>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="bg-primary h-4 rounded-full transition-all duration-500 flex items-center justify-center" style={{ width: `${overallProgress}%` }}>
                                   <span className="text-xs font-bold text-white">{overallProgress}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                         {flashcardSessions.map(session => {
                            const totalQuestions = session.question_sets?.questions?.length || 0;
                            const answeredQuestions = (session.correct_answers || 0) + (session.incorrect_answers || 0);
                            const progressPercent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
                            const isCompleted = progressPercent >= 100;

                            return (
                                <button 
                                    key={session.id} 
                                    className="w-full text-left bg-white p-4 rounded-lg border hover:shadow-md transition-shadow"
                                    onClick={() => setViewingSession(session)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold text-gray-800">{session.question_sets?.subject_name || 'Assunto desconhecido'}</p>
                                            <p className="text-xs text-gray-500">
                                                Iniciado em: {new Date(session.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        {isCompleted && (
                                            <span className="flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon className="w-4 h-4"/>
                                                Concluído
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mt-3">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 flex-grow">
                                            <div className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }}></div>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-600 w-24 text-right">{answeredQuestions} / {totalQuestions}</span>
                                    </div>
                                </button>
                            );
                        })}
                        </div>
                    </div>
                );
            case 'details':
                return (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-700">Informações do Aluno</h3>
                        </div>
                        <div className="text-sm">
                            <p><strong className="text-gray-600 w-24 inline-block">ID do Aluno:</strong> <span className="text-gray-800 font-mono text-xs">{student.id}</span></p>
                            <p><strong className="text-gray-600 w-24 inline-block">Nome:</strong> <span className="text-gray-800">{student.name}</span></p>
                            <p><strong className="text-gray-600 w-24 inline-block">Email:</strong> <span className="text-gray-800">{student.email || 'N/A'}</span></p>
                            <p><strong className="text-gray-600 w-24 inline-block">Curso:</strong> <span className="text-gray-800">{student.classes?.courses?.name || 'N/A'}</span></p>
                            <p><strong className="text-gray-600 w-24 inline-block">Turma:</strong> <span className="text-gray-800">{student.classes?.name || 'N/A'}</span></p>
                            <p><strong className="text-gray-600 w-24 inline-block">Matrícula:</strong> <span className="text-gray-800">{new Date(student.created_at).toLocaleString()}</span></p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>
            <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out" style={{ transform: 'translateX(0)' }}>
                {/* Header */}
                <header className="p-4 border-b bg-gray-50 flex-shrink-0">
                    <div className="flex items-start justify-between">
                         <div className="flex items-center gap-4">
                            {student.image_url ? (
                                <img src={student.image_url} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-2xl font-bold text-primary">{student.name.charAt(0)}</span>
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
                                <p className="text-sm text-gray-500">{student.classes?.courses?.name} / {student.classes?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onEditRequest(student)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"><EditIcon className="w-5 h-5"/></button>
                            <button onClick={() => onDeleteRequest(student.id)} className="p-2 rounded-lg hover:bg-red-100 text-red-600"><TrashIcon className="w-5 h-5"/></button>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200"><XIcon className="w-6 h-6 text-gray-600" /></button>
                        </div>
                    </div>
                </header>
                
                {/* Tabs */}
                <nav className="border-b flex-shrink-0">
                    <button onClick={() => setActiveTab('analysis')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'analysis' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Análise</button>
                    <button onClick={() => setActiveTab('tests')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'tests' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Testes</button>
                    <button onClick={() => setActiveTab('flashcards')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'flashcards' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Flashcards</button>
                    <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:bg-gray-100'}`}>Dados Cadastrais</button>
                </nav>

                {/* Content */}
                <main className="flex-grow p-6 overflow-y-auto">
                    {renderTabContent()}
                </main>
            </div>

            {viewingSession && (
                <FlashcardSessionDetailModal
                    session={viewingSession}
                    onClose={() => setViewingSession(null)}
                />
            )}

            {takingTest && (
                <TestSessionModal
                    studentId={student.id}
                    test={takingTest}
                    onClose={() => {
                        setTakingTest(null);
                        fetchData(); // Refresh data after test is done
                    }}
                />
            )}
        </>
    );
};

export default StudentProfile;