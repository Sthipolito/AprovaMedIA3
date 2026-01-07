
export interface ChatMessage {
    role: 'user' | 'model' | 'system';
    content: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswerIndex: number | null;
    explanation?: string;
    mediaUrl?: string;
}

// --- Estrutura de Conteúdo Acadêmico ---
export interface Course {
    id: string;
    name: string;
    image_url?: string;
    modules?: Module[];
    classes?: Class[];
}

export interface Module {
    id: string;
    courseId: string;
    name: string;
    image_url?: string;
    disciplines?: Discipline[];
}

export interface Discipline {
    id: string;
    moduleId: string;
    name: string;
    image_url?: string;
    question_sets?: QuestionSet[];
    official_summaries?: OfficialSummary[];
}


// Estrutura de Alunos
export interface Class {
    id: string;
    courseId: string;
    name: string;
    image_url?: string;
    courses?: Course;
    students?: Student[];
}

export interface Student {
    id: string;
    classId: string;
    name: string;
    created_at: string;
    image_url?: string;
    classes?: Class;
    user_id?: string; // Link to auth.users
    email?: string;
    // Gamification Fields
    xp?: number;
    level?: number;
    current_streak?: number;
    last_study_date?: string;
    // Subscription Fields
    subscription_status?: 'active' | 'inactive' | 'overdue' | 'trial';
    asaas_customer_id?: string;
}


export interface QuestionSet {
    id: string;
    disciplineId: string;
    subjectName: string;
    questions: QuizQuestion[];
    image_url?: string;
    createdAt: string;
    // New metadata fields for rich UI
    relevance?: 'Alta' | 'Média' | 'Baixa';
    incidence?: number; // percentage e.g. 1.96
    difficulty?: 'Fácil' | 'Média' | 'Difícil';
    // Otimização de Performance
    question_count?: number; // Vindo da função SQL
}

export interface QuestionBank {
    [id: string]: QuestionSet;
}

export interface Test {
    id: string;
    name: string;
    questions: QuizQuestion[];
    createdAt: string;
    course_id?: string;
    module_id?: string;
    discipline_id?: string;
    test_type: 'fixed' | 'scheduled';
    duration_minutes?: number; // Duração em minutos para testes fixos
    banca?: string; // Nova propriedade para filtrar por banca
    // For analytics
    attemptCount?: number;
    averageScore?: number;
    assignments?: TestAssignment[];
}

export interface TestAssignment {
    id: string;
    test_id: string;
    start_time: string;
    end_time: string;
    classes: { id: string; name: string }[];
    students: { id: string; name: string }[];
}

export interface TestAssignmentClass {
    assignment_id: string;
    class_id: string;
}

export interface TestAssignmentStudent {
    assignment_id: string;
    student_id: string;
}


// --- Tipos para o CRM e Análise ---

export interface StudentTestAttempt {
    id: string;
    created_at: string;
    student_id: string;
    test_id: string;
    score: number;
    assignment_id?: string | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    answers?: any; // JSONB
    completed_at?: string | null;
    tests?: Pick<Test, 'name'>;
    students?: { name: string }; // For getting student name in detailed views
}

export interface StudentActivityLog {
    id: string;
    created_at: string;
    student_id: string;
    // Tipos de atividade: 'flashcard_session_started', 'flashcard_session_restarted', 'flashcard_correct_answer', 'flashcard_incorrect_answer', 'flashcard_hint_used', 'flashcard_session_completed'
    activity_type: string;
    description: string;
    metadata?: any;
}

export interface ContentAnalyticsData {
    studentCount: number;
    testCount: number;
    averageScore: number;
    flashcardSessionCount: number;
    averageFlashcardAccuracy: number;
    students: {
        id: string;
        name: string;
        testAverage: number;
        flashcardAccuracy: number;
    }[];
    tests: {
        id: string;
        name: string;
        average: number;
    }[];
    flashcardSessions: (StudentFlashcardSession & { students: { name: string } | null })[];
    activityLog: (StudentActivityLog & { students: { name: string } | null })[];
}

export interface StudentContextualPerformance {
    studentTestAverage: number;
    peerTestAverage: number;
    testAttempts: StudentTestAttempt[];
    studentFlashcardAccuracy: number;
    peerFlashcardAccuracy: number;
    flashcardSessions: StudentFlashcardSession[];
}

// --- Tipos para Análise de Aluno ---

// Novo tipo para tópicos de desempenho granulares (pontos fortes/fracos)
export interface PerformanceTopic {
    questionSetId: string;
    subjectName: string;
    disciplineName: string;
    accuracy: number;
}

// Novo tipo para a aba Testes no perfil do aluno
export interface StudentAvailableTest extends Test {
    attempts: StudentTestAttempt[];
}

export interface StudentAnalytics {
    overallProgress: number;
    testAverage: number;
    flashcardAccuracy: number;
    studyDays: number;
    totalSessions: number;
    strengths: PerformanceTopic[];
    weaknesses: PerformanceTopic[];
    recentActivity: (StudentActivityLog & { students: { name: string } | null })[];
}


// --- Tipos para Sessões de Estudo (anteriormente Flashcard) ---
export interface FlashcardSession {
    id: string;
    student_id: string;
    question_set_id: string;
    current_question_index: number;
    status: 'in_progress' | 'completed';
    correct_answers: number;
    incorrect_answers: number;
    hints_used: number;
    created_at: string;
    completed_at: string | null;
}

export interface StudentFlashcardSession extends FlashcardSession {
    question_sets: {
        id: string;
        subject_name: string;
        questions: QuizQuestion[];
    } | null;
}

export interface FlashcardResponse {
    id?: string;
    session_id: string;
    question_index: number;
    was_correct: boolean;
    used_ai_hint: boolean;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

// Enum for Spaced Repetition Ratings
export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface StudentQuestionRating {
    id: string;
    created_at: string;
    student_id: string;
    question_set_id: string;
    question_text: string;
    difficulty: QuestionDifficulty;
}

// --- Tipos para o Dashboard Geral ---
export interface DashboardAnalytics {
    totalStudents: number;
    totalCourses: number;
    totalModules: number;
    totalDisciplines: number;
    totalQuestions: number;
    totalTests: number;
    totalFlashcardSessions: number;
    platformAverageScore: number;
    platformFlashcardAccuracy: number;
    topPerformingStudents: { id: string; name: string; score: number; activityCount: number; }[];
    mostActiveStudents: { id: string; name: string; score: number; activityCount: number; }[];
    recentActivity: (StudentActivityLog & { students: { name: string } | null })[];
    coursePerformance: { id: string; name: string; averageScore: number }[];
    classPerformance: { id: string; name: string; averageScore: number }[];
    hardestSubjects: { id: string; name: string; disciplineId: string; disciplineName: string; accuracy: number }[];
    easiestSubjects: { id: string; name: string; disciplineId: string; disciplineName: string; accuracy: number }[];
    courseContentBreakdown: {
        id: string;
        name: string;
        moduleCount: number;
        disciplineCount: number;
        questionSetCount: number;
    }[];
    engagementOverTime: { date: string; count: number }[];
}

// --- Tipos para o Contexto de Usuário e Tutor IA ---
export type UserRole = 
    | { role: 'teacher' } 
    | { role: 'student'; studentId: string; studentName: string; };

export interface UserContextType {
    userRole: UserRole;
    setUserRole: (role: UserRole) => void;
    allStudents: Student[];
}

// --- NOVOS TIPOS ---

// Tipos para Resumos Oficiais
export interface OfficialSummary {
    id: string;
    created_at: string;
    discipline_id: string;
    title: string;
    content: string;
}

// Tipos para os verdadeiros Flashcards (Pergunta/Resposta)
export interface TrueFlashcard {
    question: string;
    answer: string;
    tag?: string;
    mnemonic?: string;
}

export interface FlashcardSet {
    id: string;
    created_at: string;
    discipline_id: string;
    subject_name: string;
    flashcards: TrueFlashcard[];
    image_url?: string;
}

// Tipos para personalização do aluno
export interface StudentGoal {
    id?: string;
    student_id: string;
    target_institution: string;
    target_score: number;
    daily_questions_goal: number;
    daily_study_minutes_goal: number;
    study_days: string[]; // e.g. ['Mon', 'Wed', 'Fri']
    exam_date?: string;
    created_at?: string;
    preferences?: {
        strengths: string[]; // list of discipline IDs or Names
        weaknesses: string[];
    };
}

export interface TrailStep {
    id: string;
    type: 'summary' | 'questions' | 'test' | 'flashcards';
    title: string;
    description: string;
    contentId: string; // ID of the summary, question set, or test
    status: 'pending' | 'completed';
    estimatedTime: number; // minutes
}

export interface LearningTrail {
    id: string;
    generatedAt: string;
    studentId: string;
    steps: TrailStep[];
}

// --- Tipos para Biblioteca Pessoal ---
export interface LibraryItem {
    library_id: string;
    added_at: string;
    question_set_id: string;
    subject_name: string;
    image_url?: string;
    relevance: 'Alta' | 'Média' | 'Baixa';
    difficulty: 'Fácil' | 'Média' | 'Difícil';
    incidence: number;
    questions: QuizQuestion[];
}

// --- FASE 4: Marketplace & Collaboration Types ---

export interface MarketplaceItem {
    id: string;
    title: string;
    description: string;
    price: number;
    image_url?: string;
    category: string;
    content_id: string; // link to question_set or course
    content_type: 'question_set' | 'course';
    author_id?: string; // optional author
}

export interface StudyRoom {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_at: string;
    participant_count?: number;
}

export interface RoomMessage {
    id: string;
    room_id: string;
    user_id: string;
    content: string;
    created_at: string;
    student?: { name: string }; // Joined data
}
