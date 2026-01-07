import { supabase } from './supabaseClient';
import { StudentTestAttempt, StudentActivityLog, Test, StudentFlashcardSession, FlashcardResponse } from '../types';

/**
 * Busca o histórico de tentativas de teste de um aluno.
 * @param studentId O ID do aluno.
 * @returns Uma promessa que resolve para um array de tentativas de teste.
 */
export const getStudentTestAttempts = async (studentId: string): Promise<StudentTestAttempt[]> => {
    const { data, error } = await supabase
        .from('student_test_attempts')
        .select('*, tests(name)') // Junta com a tabela de testes para pegar o nome
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching student test attempts:', error.message || error);
        return [];
    }
    return data || [];
};

/**
 * Busca o log de atividades de um aluno.
 * @param studentId O ID do aluno.
 * @returns Uma promessa que resolve para um array de logs de atividade.
 */
export const getStudentActivityLog = async (studentId: string): Promise<StudentActivityLog[]> => {
    const { data, error } = await supabase
        .from('student_activity_log')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(10); // Limita às 10 atividades mais recentes

    if (error) {
        console.error('Error fetching student activity log:', error.message || error);
        return [];
    }
    return data || [];
};

/**
 * Registra um evento de atividade para um aluno usando uma função RPC segura.
 * @param studentId O ID do aluno.
 * @param activityType O tipo de atividade (ex: 'flashcard_correct_answer').
 * @param description Uma descrição do evento.
 * @param metadata Dados adicionais em JSON.
 */
export const logStudentActivity = async (studentId: string, activityType: string, description: string, metadata?: any): Promise<void> => {
    const { error } = await supabase.rpc('log_student_activity', {
        p_student_id: studentId,
        p_activity_type: activityType,
        p_description: description,
        p_metadata: metadata || {},
    });

    if (error) {
        console.error('Error logging student activity:', error.message || error);
    }
};

/**
 * Busca as sessões de flashcard (em andamento e concluídas) por um aluno.
 * @param studentId O ID do aluno.
 * @returns Uma promessa que resolve para um array de sessões de flashcard.
 */
export const getStudentFlashcardSessions = async (studentId: string): Promise<StudentFlashcardSession[]> => {
    const { data, error } = await supabase.rpc('get_student_flashcard_sessions_details', {
        p_student_id: studentId
    });

    if (error) {
        console.error('Error fetching student flashcard sessions from RPC:', error.message || error);
        return [];
    }
    return data || [];
};

/**
 * Busca todas as sessões de flashcard da plataforma com detalhes.
 * @returns Uma promessa que resolve para um array de sessões de flashcard.
 */
export const getAllFlashcardSessions = async (): Promise<any[]> => {
    const { data, error } = await supabase.rpc('get_all_flashcard_sessions_details');
    if (error) {
        console.error('Error fetching all flashcard sessions from RPC:', error.message || error);
        return [];
    }
    return data || [];
};


/**
 * Busca todas as respostas para uma sessão de flashcard específica.
 * @param sessionId O ID da sessão.
 * @returns Uma promessa que resolve para um array de respostas de flashcard.
 */
export const getFlashcardResponsesForSession = async (sessionId: string): Promise<FlashcardResponse[]> => {
    const { data, error } = await supabase
        .from('flashcard_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('question_index', { ascending: true });

    if (error) {
        console.error('Error fetching flashcard responses:', error.message || error);
        return [];
    }

    return data || [];
};