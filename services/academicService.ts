
import { supabase } from './supabaseClient';
import { Course, Module, Discipline, Class, Student, QuestionSet, OfficialSummary, TrueFlashcard, FlashcardSet } from '../types';

// ... (Auth related functions remain unchanged)

export const createStudentProfile = async (userId: string, name: string, classId: string, email: string, imageUrl?: string): Promise<Student | null> => {
    const { data, error } = await supabase
        .from('students')
        .insert({ user_id: userId, name: name, class_id: classId, email: email, image_url: imageUrl })
        .select().single();
    if (error) throw error;
    return data ? { ...data, classId: data.class_id } : null;
};

export const getStudentProfile = async (userId: string): Promise<Student | null> => {
    const { data, error } = await supabase
        .from('students')
        .select('*, classes(*, courses(*))')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') console.error('Error fetching student profile:', error);
    return data ? { ...data, classId: data.class_id } as Student : null;
};

export const getTeacherProfile = async (userId: string): Promise<{ id: string, name: string } | null> => {
    const { data, error } = await supabase.from('teachers').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') console.error('Error fetching teacher profile:', error);
    return data;
};

export const ensureTeacherProfile = async (userId: string, email: string, name: string): Promise<void> => {
    await supabase.from('teachers').upsert({ user_id: userId, email: email, name: name }, { onConflict: 'user_id' });
};

// ... (CRUD Functions remain unchanged)

export const getCourses = async (): Promise<Course[]> => {
    const { data, error } = await supabase.from('courses').select('*').order('name');
    if (error) return [];
    return data || [];
};

export const addCourse = async (name: string, imageUrl?: string): Promise<Course | null> => {
    const { data, error } = await supabase.rpc('add_course', { p_name: name, p_image_url: imageUrl }).select().single();
    if (error) throw error;
    return data || null;
};

export const updateCourse = async (id: string, updates: { name?: string; image_url?: string }): Promise<Course | null> => {
    const { data, error } = await supabase.rpc('update_course', { p_course_id: id, p_name: updates.name, p_image_url: updates.image_url }).select().single();
    if (error) throw error;
    return data || null;
};

export const deleteCourse = async (id: string): Promise<void> => {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw new Error("Erro ao excluir curso.");
};

export const getModules = async (courseId?: string): Promise<Module[]> => {
    let query = supabase.from('modules').select('*').order('name');
    if(courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query;
    return error ? [] : data || [];
};

export const addModule = async (courseId: string, name: string, imageUrl?: string): Promise<Module | null> => {
    const { data, error } = await supabase.rpc('add_module', { p_course_id: courseId, p_name: name, p_image_url: imageUrl }).select().single();
    if (error) throw error;
    return data ? { ...data, courseId: data.course_id } : null;
};

export const updateModule = async (id: string, updates: { name?: string; image_url?: string }): Promise<Module | null> => {
    const { data, error } = await supabase.rpc('update_module', { p_module_id: id, p_name: updates.name, p_image_url: updates.image_url }).select().single();
    if (error) throw error;
    return data ? { ...data, courseId: data.course_id } : null;
};

export const deleteModule = async (id: string): Promise<void> => {
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) throw new Error("Erro ao excluir módulo.");
};

export const getDisciplines = async (moduleId?: string): Promise<Discipline[]> => {
    let query = supabase.from('disciplines').select('*').order('name');
    if(moduleId) query = query.eq('module_id', moduleId);
    const { data, error } = await query;
    return error ? [] : data || [];
};

export const addDiscipline = async (moduleId: string, name: string, imageUrl?: string): Promise<Discipline | null> => {
    const { data, error } = await supabase.rpc('add_discipline', { p_module_id: moduleId, p_name: name, p_image_url: imageUrl }).select().single();
    if (error) throw error;
    return data ? { ...data, moduleId: data.module_id } : null;
};

export const updateDiscipline = async (id: string, updates: { name?: string; image_url?: string }): Promise<Discipline | null> => {
    const { data, error } = await supabase.rpc('update_discipline', { p_discipline_id: id, p_name: updates.name, p_image_url: updates.image_url }).select().single();
    if (error) throw error;
    return data ? { ...data, moduleId: data.module_id } : null;
};

export const deleteDiscipline = async (id: string): Promise<void> => {
    // Robust delete implementation kept from previous context
    const { data: tests } = await supabase.from('tests').select('id').eq('discipline_id', id);
    if (tests && tests.length > 0) {
        const testIds = tests.map(t => t.id);
        await supabase.from('student_test_attempts').delete().in('test_id', testIds);
        const { data: assignments } = await supabase.from('test_assignments').select('id').in('test_id', testIds);
        if (assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);
            await supabase.from('test_assignment_classes').delete().in('assignment_id', assignmentIds);
            await supabase.from('test_assignment_students').delete().in('assignment_id', assignmentIds);
            await supabase.from('test_assignments').delete().in('id', assignmentIds);
        }
        await supabase.from('tests').delete().in('id', testIds);
    }
    const { data: qSets } = await supabase.from('question_sets').select('id').eq('discipline_id', id);
    if (qSets && qSets.length > 0) {
        const qSetIds = qSets.map(q => q.id);
        const { data: sessions } = await supabase.from('flashcard_sessions').select('id').in('question_set_id', qSetIds);
        if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map(s => s.id);
            await supabase.from('flashcard_responses').delete().in('session_id', sessionIds);
            await supabase.from('flashcard_sessions').delete().in('id', sessionIds);
        }
        await supabase.from('student_library').delete().in('question_set_id', qSetIds);
        await supabase.from('student_question_ratings').delete().in('question_set_id', qSetIds);
        await supabase.from('flashcard_progress').delete().in('question_set_id', qSetIds);
        await supabase.from('marketplace_items').delete().match({ content_type: 'question_set' }).in('content_id', qSetIds);
        await supabase.from('question_sets').delete().in('id', qSetIds);
    }
    await supabase.from('official_summaries').delete().eq('discipline_id', id);
    await supabase.from('flashcard_sets').delete().eq('discipline_id', id);
    const { error } = await supabase.from('disciplines').delete().eq('id', id);
    if (error) throw new Error(`Erro ao excluir disciplina: ${error.message}`);
};

export const getClasses = async (courseId?: string): Promise<Class[]> => {
    let query = supabase.from('classes').select('*').order('name');
    if(courseId) query = query.eq('course_id', courseId);
    const { data, error } = await query;
    return error ? [] : data || [];
};

export const addClass = async (courseId: string, name: string, imageUrl?: string): Promise<Class | null> => {
    const { data, error } = await supabase.rpc('add_class', { p_course_id: courseId, p_name: name, p_image_url: imageUrl }).select().single();
    if (error) throw error;
    return data ? { ...data, courseId: data.course_id } : null;
};

export const updateClass = async (id: string, updates: { name?: string; image_url?: string }): Promise<Class | null> => {
    const { data, error } = await supabase.rpc('update_class', { p_class_id: id, p_name: updates.name, p_image_url: updates.image_url }).select().single();
    if (error) throw error;
    return data?.[0] ? { ...data[0], courseId: data[0].course_id } : null;
};

export const deleteClass = async (id: string): Promise<void> => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) throw new Error("Erro ao excluir turma.");
};

export const getStudents = async (classId?: string): Promise<Student[]> => {
    let query = supabase.from('students').select('*, classes(*, courses(*))');
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query.order('name');
    if (error) return [];
    return data || [];
};

export const addStudent = async (classId: string, name: string, email: string, password: string, imageUrl?: string): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email, password: password, options: { data: { full_name: name, avatar_url: imageUrl } }
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário.");
    await createStudentProfile(authData.user.id, name, classId, email, imageUrl);
};

export const updateStudent = async (student: Student, updates: { name: string; image_url: string; class_id: string, email: string }): Promise<void> => {
    const { error } = await supabase.rpc('update_student_user', { p_student_id: student.user_id, p_name: updates.name, p_class_id: updates.class_id, p_image_url: updates.image_url, p_email: updates.email });
    if (error) throw error;
};

export const deleteStudent = async (studentId: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_student_user', { p_student_id: studentId });
    if (error) {
         const { error: fallbackError } = await supabase.from('students').delete().eq('id', studentId);
         if (fallbackError) throw fallbackError;
    }
};

// --- CORREÇÃO PRINCIPAL: Busca de Dados Estruturados para Gestão ---
// Substitui RPC por chamadas diretas e seleciona campos específicos
export const getStructuredDataForManagement = async (): Promise<Course[]> => {
    try {
        // Seleção manual de colunas para evitar baixar BLOBs desnecessários
        const [coursesRes, modulesRes, disciplinesRes, classesRes, studentsRes, qSetsRes] = await Promise.all([
            supabase.from('courses').select('id, name, image_url').order('name'),
            supabase.from('modules').select('id, course_id, name, image_url').order('name'),
            supabase.from('disciplines').select('id, module_id, name, image_url').order('name'),
            supabase.from('classes').select('id, course_id, name, image_url').order('name'),
            supabase.from('students').select('id, class_id, name, email, image_url, created_at, xp, level').order('name'),
            // Aqui excluímos 'questions'
            supabase.from('question_sets').select('id, discipline_id, subject_name, question_count').order('created_at')
        ]);

        if (coursesRes.error) throw coursesRes.error;

        const courses = coursesRes.data || [];
        const modules = modulesRes.data || [];
        const disciplines = disciplinesRes.data || [];
        const classes = classesRes.data || [];
        const students = studentsRes.data || [];
        const qSets = qSetsRes.data || [];

        return courses.map(course => ({
            ...course,
            modules: modules
                .filter(m => m.course_id === course.id)
                .map(mod => ({
                    ...mod,
                    courseId: mod.course_id,
                    disciplines: disciplines
                        .filter(d => d.module_id === mod.id)
                        .map(disc => ({
                            ...disc,
                            moduleId: disc.module_id,
                            question_sets: qSets.filter(q => q.discipline_id === disc.id).map(q => ({
                                ...q, 
                                subjectName: q.subject_name,
                                questions: [] // Placeholder vazio para otimização
                            }))
                        }))
                })),
            classes: classes
                .filter(c => c.course_id === course.id)
                .map(cls => ({
                    ...cls,
                    courseId: cls.course_id,
                    students: students.filter(s => s.class_id === cls.id)
                }))
        }));

    } catch (error) {
        console.error("Erro ao estruturar dados acadêmicos:", error);
        return [];
    }
};

export const getAllStudentsWithDetails = async (): Promise<Student[]> => {
    // Reutiliza a função estruturada e aplana
    const structured = await getStructuredDataForManagement();
    const allStudents: Student[] = [];
    
    structured.forEach(course => {
        course.classes?.forEach(cls => {
            cls.students?.forEach(st => {
                allStudents.push({
                    ...st,
                    classId: cls.id,
                    classes: {
                        ...cls,
                        students: undefined,
                        courses: { ...course, modules: undefined, classes: undefined }
                    }
                });
            });
        });
    });
    return allStudents.sort((a, b) => a.name.localeCompare(b.name));
};

// ... (Summary functions remain unchanged)
export const saveSummary = async (disciplineId: string, title: string, content: string): Promise<boolean> => {
    const { error } = await supabase.rpc('save_summary', { p_discipline_id: disciplineId, p_title: title, p_content: content });
    return !error;
};

export const getAllSummariesWithContext = async (): Promise<(OfficialSummary & { disciplineName: string, moduleName: string, courseName: string })[]> => {
    const { data, error } = await supabase.from('official_summaries').select('*, disciplines(name, modules(name, courses(name)))').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((item: any) => ({
        id: item.id,
        created_at: item.created_at,
        discipline_id: item.discipline_id,
        title: item.title,
        content: item.content,
        disciplineName: item.disciplines?.name || 'Sem Disciplina',
        moduleName: item.disciplines?.modules?.name || 'Sem Módulo',
        courseName: item.disciplines?.modules?.courses?.name || 'Sem Curso'
    }));
};

export const getStudentSummariesStructure = async (studentId: string): Promise<Course | null> => {
    const { data: studentData } = await supabase.from('students').select('classes(course_id)').eq('id', studentId).single();
    if (!studentData?.classes) return null;
    const classesData: any = Array.isArray(studentData.classes) ? studentData.classes[0] : studentData.classes;
    const courseId = classesData?.course_id;
    if (!courseId) return null;
    const { data } = await supabase.from('courses').select(`*, modules (*, disciplines (*, official_summaries (*)))`).eq('id', courseId).single();
    return data;
};

export const updateSummary = async (summaryId: string, updates: { title: string; content: string }): Promise<OfficialSummary | null> => {
    const { data, error } = await supabase.from('official_summaries').update(updates).eq('id', summaryId).select().single();
    if (error) throw error;
    return data;
};

export const deleteSummary = async (summaryId: string): Promise<void> => {
    const { error } = await supabase.from('official_summaries').delete().eq('id', summaryId);
    if (error) throw error;
};

export const saveFlashcardSet = async (disciplineId: string, subjectName: string, flashcards: TrueFlashcard[]): Promise<boolean> => {
    const { error } = await supabase.rpc('save_flashcard_set', { p_discipline_id: disciplineId, p_subject_name: subjectName, p_flashcards: flashcards });
    return !error;
};
