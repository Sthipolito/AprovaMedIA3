import { supabase } from './supabaseClient';
import { DashboardAnalytics } from '../types';

export const getDashboardAnalytics = async (): Promise<DashboardAnalytics> => {
    // A lógica complexa foi movida para uma função RPC no Supabase (get_full_dashboard_analytics)
    // por performance e para lidar com Row Level Security (RLS) de forma segura.
    // O frontend agora faz uma única chamada para obter todos os dados já agregados.
    const { data, error } = await supabase.rpc('get_full_dashboard_analytics');

    if (error) {
        console.error("Error fetching dashboard analytics from RPC:", error.message || error);
        // Retorna um estado inicial vazio para evitar que a UI quebre em caso de erro.
        return {
            totalStudents: 0,
            totalCourses: 0,
            totalModules: 0,
            totalDisciplines: 0,
            totalQuestions: 0,
            totalTests: 0,
            totalFlashcardSessions: 0,
            platformAverageScore: 0,
            platformFlashcardAccuracy: 0,
            topPerformingStudents: [],
            mostActiveStudents: [],
            recentActivity: [],
            coursePerformance: [],
            classPerformance: [],
            hardestSubjects: [],
            easiestSubjects: [],
            courseContentBreakdown: [],
            engagementOverTime: [],
        };
    }

    // A função RPC foi projetada para retornar dados exatamente no formato de DashboardAnalytics.
    // Garantimos que arrays vazios sejam retornados em vez de nulos.
    return {
        ...data,
        topPerformingStudents: data.topPerformingStudents || [],
        mostActiveStudents: data.mostActiveStudents || [],
        recentActivity: data.recentActivity || [],
        coursePerformance: data.coursePerformance || [],
        classPerformance: data.classPerformance || [],
        hardestSubjects: data.hardestSubjects || [],
        easiestSubjects: data.easiestSubjects || [],
        courseContentBreakdown: data.courseContentBreakdown || [],
        engagementOverTime: data.engagementOverTime || [],
    };
};
