
import { supabase } from './supabaseClient';
import { FlashcardSession, FlashcardResponse, QuestionDifficulty, FlashcardSet } from '../types';

// --- Flashcard SETS (Q&A Decks) ---

export const getFlashcardSets = async (): Promise<FlashcardSet[]> => {
    const { data, error } = await supabase
        .from('flashcard_sets')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Erro ao buscar flashcard sets:", error);
        return [];
    }
    return data as FlashcardSet[];
};

export const saveFlashcardSet = async (disciplineId: string, subjectName: string, flashcards: any[]): Promise<boolean> => {
    const { error } = await supabase
        .from('flashcard_sets')
        .insert({
            discipline_id: disciplineId,
            subject_name: subjectName,
            flashcards: flashcards,
        });

    if (error) {
        console.error("Erro ao salvar flashcard set:", error);
        return false;
    }
    return true;
};

export const deleteFlashcardSet = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('flashcard_sets')
        .delete()
        .eq('id', id);
    
    if (error) return false;
    return true;
};


// --- Flashcard SESSIONS (Study Mode) ---

/**
 * Busca uma sessão de flashcard em andamento ou cria uma nova usando uma função RPC segura.
 */
export const getOrCreateSession = async (studentId: string, questionSetId: string): Promise<FlashcardSession | null> => {
    const { data, error } = await supabase.rpc('get_or_create_flashcard_session', {
        p_student_id: studentId,
        p_question_set_id: questionSetId
    });

    if (error) {
        console.error('Erro ao criar sessão de flashcards:', error.message || error);
        return null;
    }
    
    // O RPC retorna um único objeto JSON que é a linha da sessão.
    // O cliente Supabase o analisa automaticamente.
    return data as FlashcardSession;
};

/**
 * Salva a resposta de um aluno a um flashcard.
 */
export const saveFlashcardResponse = async (response: Omit<FlashcardResponse, 'id'>): Promise<FlashcardResponse | null> => {
    const { data, error } = await supabase.rpc('save_my_flashcard_response', {
        p_session_id: response.session_id,
        p_question_index: response.question_index,
        p_was_correct: response.was_correct,
        p_used_ai_hint: response.used_ai_hint,
    }).single();

    if (error) {
        console.error('Error saving flashcard response via RPC:', error.message || error);
        return null;
    }

    return data as FlashcardResponse | null;
};

/**
 * Atualiza o progresso (índice da questão atual) de uma sessão.
 */
export const updateSessionProgress = async (sessionId: string, newIndex: number): Promise<boolean> => {
    const { error } = await supabase
        .from('flashcard_sessions')
        .update({ current_question_index: newIndex })
        .eq('id', sessionId);

    if (error) {
        console.error('Error updating session progress:', error.message || error);
        return false;
    }
    return true;
};

/**
 * Marca uma sessão como concluída.
 */
export const completeSession = async (sessionId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('flashcard_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

    if (error) {
        console.error('Error completing session:', error.message || error);
        return false;
    }
    return true;
};

/**
 * Incrementa um contador de estatísticas (acertos, erros, dicas) para uma sessão de forma atômica.
 */
export const incrementSessionStat = async (sessionId: string, stat: 'correct' | 'incorrect' | 'hint'): Promise<boolean> => {
    const { error } = await supabase.rpc('increment_flashcard_stat', {
        session_id_input: sessionId,
        stat_to_increment: stat,
    });

    if (error) {
        console.error(`Error incrementing ${stat} count:`, error.message || error);
        return false;
    }
    return true;
};

/**
 * Reseta o progresso e as estatísticas de uma sessão para o início.
 */
export const restartSession = async (sessionId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('flashcard_sessions')
        .update({ 
            current_question_index: 0,
            correct_answers: 0,
            incorrect_answers: 0,
            hints_used: 0,
            status: 'in_progress',
            completed_at: null 
        })
        .eq('id', sessionId);

    if (error) {
        console.error('Error restarting session:', error.message || error);
        return false;
    }
    return true;
};


/**
 * Salva ou atualiza a avaliação de dificuldade de uma questão por um aluno.
 */
export const saveQuestionDifficulty = async (
    studentId: string,
    questionSetId: string,
    questionText: string,
    difficulty: QuestionDifficulty
): Promise<boolean> => {
    const { error } = await supabase
        .from('student_question_ratings')
        .upsert(
            {
                student_id: studentId,
                question_set_id: questionSetId,
                question_text: questionText,
                difficulty: difficulty,
            },
            { onConflict: 'student_id,question_set_id,question_text' }
        );

    if (error) {
        console.error('Error saving question difficulty:', error.message || error);
        return false;
    }
    return true;
};

/**
 * Obtém a avaliação de dificuldade de uma questão por um aluno, se existir.
 */
export const getQuestionDifficulty = async (
    studentId: string,
    questionSetId: string,
    questionText: string
): Promise<QuestionDifficulty | null> => {
    const { data, error } = await supabase
        .from('student_question_ratings')
        .select('difficulty')
        .eq('student_id', studentId)
        .eq('question_set_id', questionSetId)
        .eq('question_text', questionText)
        .single();
    
    if (error && error.code !== 'PGRST116') { // Ignora o erro "nenhuma linha encontrada"
        console.error('Error fetching question difficulty:', error.message || error);
    }

    return data ? data.difficulty : null;
};
