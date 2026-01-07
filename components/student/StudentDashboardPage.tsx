
import React, { useState, useEffect } from 'react';
import { Student, StudentAnalytics } from '../../types';
import * as analyticsService from '../../services/analyticsService';
import * as gamificationService from '../../services/gamificationService';
import * as spacedRepetitionService from '../../services/spacedRepetitionService';
import * as geminiService from '../../services/geminiService';
import { BarChartIcon, LayersIcon, ActivityIcon, CalendarIcon, TrendingUpIcon, BrainCircuitIcon } from '../IconComponents';

interface StudentDashboardPageProps {
    student: Student;
}

// --- AI Insights Widget ---
const AIInsightsWidget: React.FC<{ analytics: StudentAnalytics }> = ({ analytics }) => {
    const [insight, setInsight] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            const text = await geminiService.generateStudyInsights(analytics);
            setInsight(text);
            setIsLoading(false);
        };
        fetchInsights();
    }, [analytics]);

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-xl shadow-lg text-white mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <BrainCircuitIcon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold">Mentor IA: Diagnóstico Estratégico</h3>
                </div>
                
                {isLoading ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-white/20 rounded w-3/4"></div>
                            <div className="h-4 bg-white/10 rounded"></div>
                            <div className="h-4 bg-white/10 rounded w-5/6"></div>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-invert max-w-none text-sm text-indigo-100">
                        <p className="whitespace-pre-wrap">{insight}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; colorClass?: string }> = ({ title, value, icon: Icon, colorClass = "text-primary" }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className={`p-3 rounded-full bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
            <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ student }) => {
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [gamification, setGamification] = useState<any>(null);
    const [flashcardsDue, setFlashcardsDue] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [analyticsData, gamificationData, dueCount] = await Promise.all([
                analyticsService.getStudentComprehensiveAnalytics(student.id),
                gamificationService.getStudentGamificationStats(student.id),
                spacedRepetitionService.getDueFlashcardsCount(student.id)
            ]);
            setAnalytics(analyticsData);
            setGamification(gamificationData);
            setFlashcardsDue(dueCount);
            setIsLoading(false);
        };
        fetchData();
    }, [student.id]);

    if (isLoading) {
        return (
            <div className="h-full flex justify-center items-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800">Olá, {student.name.split(' ')[0]}!</h1>
                <p className="text-gray-500 mt-1">Bem-vindo ao seu painel de estudos.</p>
            </header>

            <main className="flex-grow p-6">
                {analytics && <AIInsightsWidget analytics={analytics} />}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        title="Nível Atual" 
                        value={gamification?.level || 1} 
                        icon={TrendingUpIcon} 
                        colorClass="text-purple-600"
                    />
                    <StatCard 
                        title="XP Total" 
                        value={gamification?.xp || 0} 
                        icon={ActivityIcon} 
                        colorClass="text-yellow-600"
                    />
                    <StatCard 
                        title="Flashcards Vencidos" 
                        value={flashcardsDue} 
                        icon={LayersIcon} 
                        colorClass="text-red-500"
                    />
                     <StatCard 
                        title="Média em Testes" 
                        value={`${analytics?.testAverage || 0}%`} 
                        icon={BarChartIcon} 
                        colorClass="text-blue-600"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Pontos Fortes</h3>
                        {analytics?.strengths.length ? (
                            <ul className="space-y-3">
                                {analytics.strengths.map((s, i) => (
                                    <li key={i} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                                        <span className="font-medium text-green-900">{s.subjectName}</span>
                                        <span className="font-bold text-green-700">{s.accuracy}%</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-500 text-sm">Sem dados suficientes ainda.</p>}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Pontos a Melhorar</h3>
                        {analytics?.weaknesses.length ? (
                            <ul className="space-y-3">
                                {analytics.weaknesses.map((w, i) => (
                                    <li key={i} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                                        <span className="font-medium text-orange-900">{w.subjectName}</span>
                                        <span className="font-bold text-orange-700">{w.accuracy}%</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-500 text-sm">Nenhum ponto fraco identificado! Continue assim.</p>}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboardPage;
