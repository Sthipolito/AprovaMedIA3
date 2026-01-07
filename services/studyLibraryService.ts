
import { supabase } from './supabaseClient';
import { LibraryItem } from '../types';

export const getStudentLibrary = async (studentId: string): Promise<LibraryItem[]> => {
    // REFACTOR: Usamos select direto com join em vez de RPC para evitar erros de SQL e complexidade.
    const { data, error } = await supabase
        .from('student_library')
        .select(`
            id,
            created_at,
            question_set_id,
            question_sets (
                id,
                subject_name,
                image_url,
                relevance,
                difficulty,
                incidence,
                questions
            )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching student library:", error.message || error);
        return [];
    }

    if (!data) return [];

    // Mapeia a estrutura aninhada do Supabase para a interface plana LibraryItem
    const mappedItems: LibraryItem[] = data.map((item: any) => {
        const qs = item.question_sets;
        // Proteção contra conjuntos de questões deletados mas ainda linkados
        if (!qs) return null; 
        
        return {
            library_id: item.id,
            added_at: item.created_at,
            question_set_id: item.question_set_id,
            subject_name: qs.subject_name || 'Conteúdo Indisponível',
            image_url: qs.image_url,
            relevance: qs.relevance || 'Média',
            difficulty: qs.difficulty || 'Média',
            incidence: qs.incidence || 0,
            questions: qs.questions || []
        };
    }).filter((item): item is LibraryItem => item !== null);

    return mappedItems;
};

export const addToLibrary = async (studentId: string, questionSetId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('student_library')
        .insert({
            student_id: studentId,
            question_set_id: questionSetId
        });

    if (error) {
        // Ignora erro de duplicata (significa que já está lá)
        if (error.code === '23505') return true;
        console.error("Error adding to library:", error.message || error);
        return false;
    }
    return true;
};

export const removeFromLibrary = async (studentId: string, questionSetId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('student_library')
        .delete()
        .match({
            student_id: studentId,
            question_set_id: questionSetId
        });

    if (error) {
        console.error("Error removing from library:", error.message || error);
        return false;
    }
    return true;
};

// Busca apenas os IDs para verificar rapidamente o que já foi adicionado (estado dos botões)
export const getLibrarySetIds = async (studentId: string): Promise<Set<string>> => {
    const { data, error } = await supabase
        .from('student_library')
        .select('question_set_id')
        .eq('student_id', studentId);

    if (error) {
        console.error("Error fetching library IDs:", error.message);
        return new Set();
    }

    return new Set(data?.map((item: any) => item.question_set_id) || []);
};
