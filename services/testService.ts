
import { supabase } from './supabaseClient';
import { Test, QuizQuestion, TestAssignment, StudentTestAttempt, StudentAvailableTest } from '../types';

export type TestWithAnalytics = Test & {
    attemptCount: number;
    averageScore: number;
    assignments: TestAssignment[];
};

export const getTestsWithAnalytics = async (): Promise<TestWithAnalytics[]> => {
    const { data: analyticsData, error: analyticsError } = await supabase.rpc('get_tests_with_analytics');

    if (analyticsError) {
        console.error("Error fetching tests with analytics from RPC:", analyticsError.message || analyticsError);
        throw analyticsError;
    }

    // WORKAROUND: Fetch static test data to ensure we have 'banca' and other potentially missing fields from RPC
    // caused by cached RPC definitions or missing columns in the view.
    const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('id, banca, course_id, module_id, discipline_id');

    if (testsError) console.error("Error fetching tests metadata:", testsError);

    // Fix: Explicitly type map values as 'any' to prevent 'unknown' inference error and ensure robust handling
    const testsMap = new Map<string, any>();
    if (testsData) {
        testsData.forEach((t: any) => testsMap.set(t.id, t));
    }

    // The RPC function is designed to return data in the correct shape, including camelCase.
    return ((analyticsData as any[]) || []).map((test: any) => {
        const staticData = testsMap.get(test.id);
        return {
            ...test,
            // Ensure nested properties are correctly mapped if RPC returns snake_case
            test_type: test.test_type,
            course_id: staticData?.course_id || test.course_id,
            module_id: staticData?.module_id || test.module_id,
            discipline_id: staticData?.discipline_id || test.discipline_id,
            duration_minutes: test.duration_minutes,
            createdAt: test.createdAt,
            banca: staticData?.banca || test.banca
        };
    });
};

export const createTest = async (
    name: string,
    questions: QuizQuestion[],
    testType: 'fixed' | 'scheduled',
    context?: { courseId?: string | null; moduleId?: string | null; disciplineId?: string | null; banca?: string | null }
): Promise<Test | null> => {
     if (!name.trim() || !questions || questions.length === 0) {
        console.error("Nome, tipo e questões são necessários.");
        return null;
    }

    try {
        const payload: any = {
            name: name,
            questions: questions,
            test_type: testType,
            course_id: context?.courseId || null,
            module_id: context?.moduleId || null,
            discipline_id: context?.disciplineId || null,
            banca: context?.banca || null
        };

        const { data, error } = await supabase
            .from('tests')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error creating test:", error);
            if (error.code === '42501') {
                alert("Erro de Permissão (RLS): O banco de dados bloqueou a criação do teste. Execute o script SQL de permissões no Supabase.");
            }
            return null;
        }

        return data;

    } catch (error: any) {
        console.error("Unexpected error creating test:", error);
        return null;
    }
};

export const createTestAssignment = async (
    testId: string,
    startTime: string,
    endTime: string,
    classIds: string[],
    studentIds: string[]
): Promise<TestAssignment | null> => {
    const { data, error } = await supabase.rpc('create_test_assignment', {
        p_test_id: testId,
        p_start_time: startTime,
        p_end_time: endTime,
        p_class_ids: classIds,
        p_student_ids: studentIds,
    }).select().single();
    
    if (error) {
        console.error("Error creating test assignment:", error.message || error);
        return null;
    }

    return data;
};


export const getTestAttempts = async (testId: string): Promise<StudentTestAttempt[]> => {
    const { data, error } = await supabase.rpc('get_test_attempts', { p_test_id: testId });

    if (error) {
        console.error("Failed to fetch test attempts from RPC", error.message || error);
        return [];
    }
    return data || [];
};

export const getStudentAvailableTests = async (studentId: string): Promise<StudentAvailableTest[]> => {
    const { data, error } = await supabase.rpc('get_student_available_tests', { p_student_id: studentId });
    
    if (error) {
        console.error("Error fetching student available tests from RPC:", error.message || error);
        return [];
    }
    return (data || []).map((test: any) => ({
        ...test,
        // Ensure nested properties are correctly mapped if RPC returns snake_case
        test_type: test.test_type,
        course_id: test.course_id,
        module_id: test.module_id,
        discipline_id: test.discipline_id,
        duration_minutes: test.duration_minutes,
        createdAt: test.createdAt,
        banca: test.banca
    }));
};


export const deleteTest = async (testId: string): Promise<void> => {
    // Manually cascade deletes for entities related to a test.

    // 1. Delete associated student test attempts.
    const { error: attemptsError } = await supabase
        .from('student_test_attempts')
        .delete()
        .eq('test_id', testId);

    if (attemptsError) {
        console.error('Error deleting student test attempts:', attemptsError.message);
        throw attemptsError;
    }

    // 2. Find all assignments related to this test.
    const { data: assignments, error: findAssignmentsError } = await supabase
        .from('test_assignments')
        .select('id')
        .eq('test_id', testId);
    
    if (findAssignmentsError) {
        console.error('Error finding test assignments to delete:', findAssignmentsError.message);
        throw findAssignmentsError;
    }
    
    if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);

        // 3. Delete links in junction tables.
        const { error: classesLinksError } = await supabase
            .from('test_assignment_classes')
            .delete()
            .in('assignment_id', assignmentIds);

        if (classesLinksError) {
            console.error('Error deleting assignment-class links:', classesLinksError.message);
            throw classesLinksError;
        }

        const { error: studentsLinksError } = await supabase
            .from('test_assignment_students')
            .delete()
            .in('assignment_id', assignmentIds);

        if (studentsLinksError) {
            console.error('Error deleting assignment-student links:', studentsLinksError.message);
            throw studentsLinksError;
        }

        // 4. Delete the assignments themselves.
        const { error: assignmentsError } = await supabase
            .from('test_assignments')
            .delete()
            .in('id', assignmentIds);

        if (assignmentsError) {
            console.error('Error deleting test assignments:', assignmentsError.message);
            throw assignmentsError;
        }
    }

    // 5. Finally, delete the test.
    const { error } = await supabase.from('tests').delete().eq('id', testId);
    if (error) {
        console.error("Error deleting test:", error.message || error);
        throw error;
    }
};

// Helper function to sync junction table entries
const syncAssignmentLinks = async (
    assignmentId: string,
    newIds: string[],
    tableName: 'test_assignment_classes' | 'test_assignment_students',
    columnName: 'class_id' | 'student_id'
) => {
    const { data: currentLinks, error: fetchErr } = await supabase
        .from(tableName)
        .select(columnName)
        .eq('assignment_id', assignmentId);
    if (fetchErr) {
        console.error(`Error fetching current links from ${tableName}:`, fetchErr.message || fetchErr);
        return;
    }
    const currentIds = currentLinks?.map((link: any) => link[columnName]) || [];

    const idsToAdd = newIds.filter(id => !currentIds.includes(id));
    const idsToRemove = currentIds.filter(id => !newIds.includes(id));

    if (idsToRemove.length > 0) {
        const { error: deleteErr } = await supabase
            .from(tableName)
            .delete()
            .eq('assignment_id', assignmentId)
            .in(columnName, idsToRemove);
        if (deleteErr) console.error(`Error deleting links from ${tableName}:`, deleteErr.message || deleteErr);
    }

    if (idsToAdd.length > 0) {
        const newLinksData = idsToAdd.map(id => ({
            assignment_id: assignmentId,
            [columnName]: id,
        }));
        const { error: insertErr } = await supabase
            .from(tableName)
            .insert(newLinksData);
        if (insertErr) console.error(`Error inserting links into ${tableName}:`, insertErr.message || insertErr);
    }
};

export const updateTestAndAssignments = async (
    testId: string,
    testDetails: Partial<Omit<Test, 'id' | 'createdAt' | 'assignments' | 'attemptCount' | 'averageScore'>>,
    assignmentDetails: { startTime: string; endTime: string; classIds: string[]; studentIds: string[] } | null
): Promise<boolean> => {
    const { error: testUpdateError } = await supabase
        .from('tests')
        .update(testDetails)
        .eq('id', testId);
    if (testUpdateError) {
        console.error("Error updating test details:", testUpdateError.message || testUpdateError);
        return false;
    }

    const { data: existingAssignments, error: fetchError } = await supabase
        .from('test_assignments')
        .select('id')
        .eq('test_id', testId);
    if (fetchError) {
        console.error("Error fetching existing assignments:", fetchError.message || fetchError);
        return false;
    }
    const existingAssignmentId = existingAssignments?.[0]?.id;

    if (testDetails.test_type === 'fixed' && existingAssignmentId) {
        const { error: deleteError } = await supabase.from('test_assignments').delete().eq('id', existingAssignmentId);
        if (deleteError) {
            console.error("Error deleting old assignment:", deleteError.message || deleteError);
            return false;
        }
    } else if (testDetails.test_type === 'scheduled' && assignmentDetails) {
        let assignmentId: string;
        if (existingAssignmentId) {
            assignmentId = existingAssignmentId;
            const { error: updateError } = await supabase
                .from('test_assignments')
                .update({ start_time: assignmentDetails.startTime, end_time: assignmentDetails.endTime })
                .eq('id', assignmentId);
            if (updateError) {
                console.error("Error updating assignment times:", updateError.message || updateError);
                return false;
            }
        } else {
            const { data, error: createError } = await supabase
                .from('test_assignments')
                .insert({ test_id: testId, start_time: assignmentDetails.startTime, end_time: assignmentDetails.endTime })
                .select('id')
                .single();
            if (createError || !data) {
                console.error("Error creating new assignment:", createError?.message || createError);
                return false;
            }
            assignmentId = data.id;
        }

        await syncAssignmentLinks(assignmentId, assignmentDetails.classIds, 'test_assignment_classes', 'class_id');
        await syncAssignmentLinks(assignmentId, assignmentDetails.studentIds, 'test_assignment_students', 'student_id');
    }

    return true;
};

// --- New Functions for Test Sessions ---

export const startTestAttempt = async (studentId: string, testId: string, assignmentId?: string): Promise<StudentTestAttempt | null> => {
    const { data, error } = await supabase.rpc('start_test_attempt', {
        p_student_id: studentId,
        p_test_id: testId,
        p_assignment_id: assignmentId,
    });
    
    if (error) {
        console.error("Error starting test attempt:", error.message || error);
        return null;
    }
    return data;
};

export const submitTestAttempt = async (attemptId: string, testQuestions: QuizQuestion[], studentAnswers: { [key: number]: number }): Promise<StudentTestAttempt | null> => {
    let correctCount = 0;
    testQuestions.forEach((q, index) => {
        if (q.correctAnswerIndex !== null && studentAnswers[index] === q.correctAnswerIndex) {
            correctCount++;
        }
    });

    const score = testQuestions.length > 0 ? Math.round((correctCount / testQuestions.length) * 100) : 0;

    const { data, error } = await supabase.rpc('submit_test_attempt', {
        p_attempt_id: attemptId,
        p_score: score,
        p_answers: studentAnswers,
    });

    if (error) {
        console.error("Error submitting test attempt:", error.message || error);
        return null;
    }
    return data;
};

export const abandonTestAttempt = async (attemptId: string): Promise<boolean> => {
    const { error } = await supabase.rpc('abandon_test_attempt', {
        p_attempt_id: attemptId
    });
    
    if (error) {
        console.error("Error abandoning test attempt:", error.message || error);
        return false;
    }
    return true;
};
