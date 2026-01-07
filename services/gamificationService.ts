
import { supabase } from './supabaseClient';

// Configuração de XP
const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_TEST_COMPLETION = 50;
const XP_PER_SUMMARY_READ = 20;

// Função para calcular o nível baseado no XP total (fórmula simples: level = sqrt(xp) / constant)
export const calculateLevel = (xp: number): number => {
    return Math.floor(Math.sqrt(xp) / 5) + 1;
};

// Função para calcular o progresso para o próximo nível (0-100%)
export const calculateLevelProgress = (xp: number): number => {
    const currentLevel = calculateLevel(xp);
    const nextLevel = currentLevel + 1;
    const xpForCurrent = Math.pow((currentLevel - 1) * 5, 2);
    const xpForNext = Math.pow((nextLevel - 1) * 5, 2);
    
    const progress = ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100;
    return Math.min(100, Math.max(0, progress));
};

// Adicionar XP ao aluno
export const awardXP = async (studentId: string, amount: number, activityType: string): Promise<{ newXP: number, newLevel: number, leveledUp: boolean } | null> => {
    try {
        // 1. Buscar dados atuais
        const { data: student, error: fetchError } = await supabase
            .from('students')
            .select('xp, level, current_streak, last_study_date')
            .eq('id', studentId)
            .single();

        if (fetchError || !student) return null;

        const currentXP = student.xp || 0;
        const currentLevel = student.level || 1;
        const newXP = currentXP + amount;
        const calculatedLevel = calculateLevel(newXP);
        const leveledUp = calculatedLevel > currentLevel;

        // 2. Lógica de Streak (Dias consecutivos)
        const today = new Date().toISOString().split('T')[0];
        let newStreak = student.current_streak || 0;
        let lastDate = student.last_study_date;

        if (lastDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                newStreak += 1; // Estudou ontem, continua o streak
            } else {
                newStreak = 1; // Quebrou o streak ou primeiro dia
            }
        }

        // 3. Atualizar no banco
        const { error: updateError } = await supabase
            .from('students')
            .update({
                xp: newXP,
                level: calculatedLevel,
                current_streak: newStreak,
                last_study_date: today
            })
            .eq('id', studentId);

        if (updateError) {
            console.error("Erro ao atualizar XP:", updateError);
            return null;
        }

        return { newXP, newLevel: calculatedLevel, leveledUp };

    } catch (error) {
        console.error("Erro no serviço de gamificação:", error);
        return null;
    }
};

export const getStudentGamificationStats = async (studentId: string) => {
     const { data, error } = await supabase
        .from('students')
        .select('xp, level, current_streak')
        .eq('id', studentId)
        .single();
    
    if (error) return null;
    return data;
};

// --- FASE 3: Leaderboard Global ---
export const getGlobalLeaderboard = async () => {
    const { data, error } = await supabase
        .from('students')
        .select('id, name, image_url, xp, level, current_streak')
        .order('xp', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Erro ao buscar leaderboard:", error);
        return [];
    }
    return data;
};
