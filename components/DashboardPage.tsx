import React, { useState, useEffect } from 'react';
import { DashboardAnalytics, StudentActivityLog, Student, StudentFlashcardSession } from '../types';
import * as dashboardService from '../services/dashboardService';
import { UsersIcon, BookOpenIcon, BarChartIcon, LayersIcon, ActivityIcon, ClipboardListIcon, GraduationCapIcon, TrendingDownIcon, TrendingUpIcon, LineChartIcon } from './IconComponents';
import ContentDetailModal from './ContentDetailModal';
import { View } from './TeacherApp';
import LineChart from './LineChart';
import DashboardDetailModal from './DashboardDetailModal';
import StudentProfile from './StudentProfile';
import TestDetailModal from './TestDetailModal';
import FlashcardSessionDetailModal from './FlashcardSessionDetailModal';
import { TestWithAnalytics } from '../services/testService';


const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; onClick?: () => void }> = ({ title, value, icon: Icon, onClick }) => {
    const isClickable = !!onClick;
    const Tag = isClickable ? 'button' : 'div';

    return (
        <Tag
            onClick={onClick}
            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4 text-left w-full
                ${isClickable ? 'transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-1' : ''}`}
        >
            <div className="p-3 bg-primary/10 rounded-full">
                <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </Tag>
    );
};

const SimpleBarChart: React.FC<{ title: string; data: { name: string; averageScore: number }[] }> = ({ title, data }) => {
    const maxValue = Math.max(...data.map(item => item.averageScore), 100);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.length > 0 ? data.map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                        <p className="text-sm font-medium text-gray-600 w-1/3 truncate" title={item.name}>{item.name}</p>
                        <div className="w-2/3 bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-primary h-4 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${(item.averageScore / maxValue) * 100}%` }}
                            >
                                <span className="text-xs font-bold text-white">{item.averageScore}%</span>
                            </div>
                        </div>
                    </div>
                )) : <p className="text-sm text-center text-gray-500 py-8">Dados insuficientes para exibir o gráfico.</p>}
            </div>
        </div>
    );
};

const Leaderboard: React.FC<{ title: string; data: { id: string; name: string; score?: number; activityCount?: number }[] }> = ({ title, data }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <ul className="space-y-3">
            {data.map((item, index) => (
                <li key={item.id} className="flex items-center gap-4">
                    <div className="font-bold text-gray-400 w-6 text-center">{index + 1}</div>
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="font-bold text-primary">{item.name.charAt(0)}</span>
                    </div>
                    <p className="font-semibold text-gray-700 flex-grow truncate">{item.name}</p>
                    {item.score !== undefined && <span className="font-bold text-primary">{item.score} pts</span>}
                    {item.activityCount !== undefined && <span className="font-bold text-primary">{item.activityCount} ações</span>}
                </li>
            ))}
        </ul>
        {data.length === 0 && <p className="text-sm text-center text-gray-500 py-8">Nenhum dado para exibir.</p>}
    </div>
);

const ActivityFeed: React.FC<{ activities: (StudentActivityLog & { students: { name: string } | null })[] }> = ({ activities }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Atividade Recente</h3>
        <ul className="space-y-4">
            {activities.map(activity => (
                <li key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 bg-primary/10 rounded-full"><ActivityIcon className="w-4 h-4 text-primary" /></div>
                    <div>
                        <p className="text-sm text-gray-800">
                           <span className="font-semibold">{activity.students?.name || 'Um aluno'}</span> {activity.description.toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                </li>
            ))}
        </ul>
        {activities.length === 0 && <p className="text-sm text-center text-gray-500 py-8">Nenhuma atividade recente.</p>}
    </div>
);

interface DashboardPageProps {
  // No longer needs setCurrentView
}

const DashboardPage: React.FC<DashboardPageProps> = () => {
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // State for first-level modal (the list)
    const [detailModal, setDetailModal] = useState<{ title: string; dataType: string; } | null>(null);

    // State for second-level modals (the actual details)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [viewingTest, setViewingTest] = useState<TestWithAnalytics | null>(null);
    const [viewingFlashcardSession, setViewingFlashcardSession] = useState<StudentFlashcardSession | null>(null);
    const [contentDetailModal, setContentDetailModal] = useState<{ level: 'discipline' | 'course' | 'module' | 'class'; contentId: string; contentName: string; } | null>(null);


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const data = await dashboardService.getDashboardAnalytics();
            setAnalytics(data);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const handleItemClick = (item: any, dataType: string) => {
        setDetailModal(null); // Close the first modal
        switch (dataType) {
            case 'students':
                setSelectedStudent(item);
                break;
            case 'tests':
                setViewingTest(item);
                break;
            case 'courses':
                setContentDetailModal({ level: 'course', contentId: item.id, contentName: item.name });
                break;
            case 'modules':
                setContentDetailModal({ level: 'module', contentId: item.id, contentName: item.name });
                break;
            case 'disciplines':
                setContentDetailModal({ level: 'discipline', contentId: item.id, contentName: item.name });
                break;
            case 'flashcardSessions':
                setViewingFlashcardSession(item);
                break;
        }
    };


    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    if (!analytics) {
        return <div className="p-6">Falha ao carregar os dados do dashboard.</div>
    }

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard Geral</h1>
                    <p className="text-gray-500 mt-1">Visão geral do desempenho e engajamento da plataforma.</p>
                </header>
                
                <main className="flex-grow p-6 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Visão Geral</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <StatCard title="Alunos" value={analytics.totalStudents} icon={UsersIcon} onClick={() => setDetailModal({ title: 'Todos os Alunos', dataType: 'students' })} />
                            <StatCard title="Cursos" value={analytics.totalCourses} icon={BookOpenIcon} onClick={() => setDetailModal({ title: 'Todos os Cursos', dataType: 'courses' })} />
                            <StatCard title="Módulos" value={analytics.totalModules} icon={LayersIcon} onClick={() => setDetailModal({ title: 'Todos os Módulos', dataType: 'modules' })} />
                            <StatCard title="Disciplinas" value={analytics.totalDisciplines} icon={GraduationCapIcon} onClick={() => setDetailModal({ title: 'Todas as Disciplinas', dataType: 'disciplines' })} />
                            <StatCard title="Questões" value={analytics.totalQuestions} icon={ClipboardListIcon} onClick={() => setDetailModal({ title: 'Todos os Assuntos (Questões)', dataType: 'questionSets' })} />
                            <StatCard title="Testes" value={analytics.totalTests} icon={ClipboardListIcon} onClick={() => setDetailModal({ title: 'Todos os Testes', dataType: 'tests' })} />
                            <StatCard title="Sessões de Flashcard" value={analytics.totalFlashcardSessions} icon={LayersIcon} onClick={() => setDetailModal({ title: 'Todas as Sessões de Flashcard', dataType: 'flashcardSessions' })} />
                            <StatCard title="Média (Testes)" value={`${analytics.platformAverageScore}%`} icon={BarChartIcon} onClick={() => setDetailModal({ title: 'Todos os Testes', dataType: 'tests' })} />
                            <StatCard title="Precisão (Cards)" value={`${analytics.platformFlashcardAccuracy}%`} icon={LayersIcon} onClick={() => setDetailModal({ title: 'Todas as Sessões de Flashcard', dataType: 'flashcardSessions' })} />
                        </div>
                    </section>

                    <section>
                         <h2 className="text-2xl font-bold text-gray-800 mb-4">Desempenho e Engajamento</h2>
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <div className="lg:col-span-2">
                                <LineChart title="Engajamento na Plataforma (Últimos 14 dias)" icon={LineChartIcon} data={analytics.engagementOverTime} />
                            </div>
                            <ActivityFeed activities={analytics.recentActivity} />
                         </div>
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <SimpleBarChart title="Desempenho por Curso (Nota Média)" data={analytics.coursePerformance} />
                            <SimpleBarChart title="Desempenho por Turma (Nota Média)" data={analytics.classPerformance} />
                         </div>
                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            <Leaderboard title="Top Alunos (Desempenho)" data={analytics.topPerformingStudents} />
                            <Leaderboard title="Alunos Mais Ativos" data={analytics.mostActiveStudents} />
                         </div>
                    </section>

                    <section>
                         <h2 className="text-2xl font-bold text-gray-800 mb-4">Análise de Conteúdo</h2>
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingDownIcon className="w-5 h-5 text-orange-500"/> Pontos de Atenção (Assuntos)</h3>
                                {analytics.hardestSubjects.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analytics.hardestSubjects.map(subject => (
                                            <li key={subject.id}>
                                                <button onClick={() => setContentDetailModal({ level: 'discipline', contentId: subject.disciplineId, contentName: subject.disciplineName })} className="w-full text-left bg-orange-50 p-3 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-sm text-orange-800 truncate" title={subject.name}>{subject.name}</p>
                                                        <p className="font-bold text-orange-700 flex-shrink-0 ml-2">{subject.accuracy}%</p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-center text-gray-500 py-8">Nenhum ponto de atenção identificado.</p>}
                             </div>
                             
                              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-green-500"/> Melhores Assuntos</h3>
                                {analytics.easiestSubjects.length > 0 ? (
                                    <ul className="space-y-2">
                                        {analytics.easiestSubjects.map(subject => (
                                            <li key={subject.id}>
                                                <button onClick={() => setContentDetailModal({ level: 'discipline', contentId: subject.disciplineId, contentName: subject.disciplineName })} className="w-full text-left bg-green-50 p-3 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold text-sm text-green-800 truncate" title={subject.name}>{subject.name}</p>
                                                        <p className="font-bold text-green-700 flex-shrink-0 ml-2">{subject.accuracy}%</p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-center text-gray-500 py-8">Dados de desempenho insuficientes.</p>}
                             </div>

                             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                 <h3 className="text-lg font-bold text-gray-800 mb-4">Estrutura do Conteúdo</h3>
                                 {analytics.courseContentBreakdown.length > 0 ? (
                                     <ul className="space-y-3">
                                         {analytics.courseContentBreakdown.map(course => (
                                             <li key={course.id} className="p-3 bg-gray-50 border rounded-lg">
                                                 <p className="font-semibold text-gray-800">{course.name}</p>
                                                 <p className="text-xs text-gray-500 mt-1">
                                                     {course.moduleCount} Módulos • {course.disciplineCount} Disciplinas • {course.questionSetCount} Assuntos
                                                 </p>
                                             </li>
                                         ))}
                                     </ul>
                                 ) : <p className="text-sm text-center text-gray-500 py-8">Nenhum curso encontrado.</p>}
                             </div>
                         </div>
                    </section>
                </main>
            </div>

            {/* First Level Modal (List) */}
            {detailModal && (
                <DashboardDetailModal
                    title={detailModal.title}
                    dataType={detailModal.dataType}
                    onClose={() => setDetailModal(null)}
                    onItemClick={handleItemClick}
                />
            )}

            {/* Second Level Modals (Details) */}
            {selectedStudent && (
                <StudentProfile 
                    student={selectedStudent} 
                    onClose={() => setSelectedStudent(null)}
                    onEditRequest={() => alert("A edição deve ser feita pela página de CRM ou Gestão Acadêmica.")}
                    onDeleteRequest={() => alert("A exclusão deve ser feita pela página de CRM ou Gestão Acadêmica.")}
                />
            )}
            {viewingTest && (
                <TestDetailModal 
                    test={viewingTest}
                    onClose={() => setViewingTest(null)}
                />
            )}
            {viewingFlashcardSession && (
                <FlashcardSessionDetailModal
                    session={viewingFlashcardSession}
                    onClose={() => setViewingFlashcardSession(null)}
                />
            )}
            {contentDetailModal && (
                <ContentDetailModal 
                    level={contentDetailModal.level as any}
                    contentId={contentDetailModal.contentId}
                    contentName={contentDetailModal.contentName}
                    onClose={() => setContentDetailModal(null)}
                />
            )}
        </>
    );
};

export default DashboardPage;