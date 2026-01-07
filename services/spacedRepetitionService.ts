
import { supabase } from './supabaseClient';
import { SRSRating } from '../types';

// Algoritmo SuperMemo 2 (SM-2)
// I(1) = 1
// I(2) = 6
// I(n) = I(n-1) * EF
// EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
// Se q < 3, recomeça repetições mas mantém EF.

interface ReviewData {
    interval: number; // Dias
    repetitions: number;
    easeFactor: number;
}

const calculateSM2 = (rating: SRSRating, previousData: ReviewData): ReviewData => {
    let { interval, repetitions, easeFactor } = previousData;
    
    // Mapear rating (again, hard, good, easy) para qualidade (0-5)
    // Again = 0 (Complete blackout)
    // Hard = 3 (Slow recall)
    // Good = 4 (Hesitated)
    // Easy = 5 (Perfect recall)
    let quality = 0;
    switch (rating) {
        case 'again': quality = 0; break;
        case 'hard': quality = 3; break;
        case 'good': quality = 4; break;
        case 'easy': quality = 5; break;
    }

    if (quality >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    } else {
        repetitions = 0;
        interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    return { interval, repetitions, easeFactor };
};

export const processFlashcardReview = async (
    studentId: string, 
    questionSetId: string, 
    cardIndex: number, 
    rating: SRSRating
) => {
    try {
        // 1. Buscar estado atual do card
        const { data: currentProgress, error } = await supabase
            .from('flashcard_progress')
            .select('*')
            .eq('student_id', studentId)
            .eq('question_set_id', questionSetId)
            .eq('card_index', cardIndex)
            .single();

        // Estado inicial padrão se não existir
        const previousData: ReviewData = currentProgress ? {
            interval: currentProgress.interval,
            repetitions: currentProgress.repetitions,
            easeFactor: currentProgress.ease_factor
        } : {
            interval: 0,
            repetitions: 0,
            easeFactor: 2.5
        };

        // 2. Calcular novos valores com SM-2
        const nextData = calculateSM2(rating, previousData);

        // 3. Calcular data da próxima revisão
        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + nextData.interval);

        // 4. Salvar no banco (Upsert)
        await supabase
            .from('flashcard_progress')
            .upsert({
                student_id: studentId,
                question_set_id: questionSetId,
                card_index: cardIndex,
                interval: nextData.interval,
                repetitions: nextData.repetitions,
                ease_factor: nextData.easeFactor,
                next_review: nextReviewDate.toISOString(),
                last_reviewed_at: new Date().toISOString()
            }, {
                onConflict: 'student_id,question_set_id,card_index'
            });

        return nextData;

    } catch (e) {
        console.error("Erro no Spaced Repetition Service:", e);
        return null;
    }
};

export const getDueFlashcardsCount = async (studentId: string): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
        .from('flashcard_progress')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .lte('next_review', today);
    
    if (error) {
        console.error("Erro ao contar flashcards vencidos:", error);
        return 0;
    }
    return count || 0;
};
