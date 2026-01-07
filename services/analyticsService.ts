import { supabase } from './supabaseClient';
import { ContentAnalyticsData, StudentContextualPerformance, StudentFlashcardSession, StudentAnalytics, PerformanceTopic } from '../types';

export const getContentAnalytics = async (
    level: 'course' | 'module' | 'discipline' | 'class',
    id: string
): Promise<ContentAnalyticsData> => {
    const result: ContentAnalyticsData = {
        studentCount: 0,
        testCount: 0,
        averageScore: 0,
        flashcardSessionCount: 0,
        averageFlashcardAccuracy: 0,
        students: [],
        tests: [],
        flashcardSessions: [],
        activityLog: [],
    };

    try {
        // Step 1: Fetch the entire academic structure using a privileged RPC to bypass RLS.
        const { data: allCourses, error: structError } = await supabase.rpc('get_structured_academic_content');
        if (structError || !allCourses) {
            throw new Error(`Failed to fetch academic structure: ${structError?.message}`);
        }

        // Step 2: Identify the student population based on the context's top-level course.
        let targetCourseId: string | null = null;
        if (level === 'course') {
            targetCourseId = id;
        } else if (level === 'class') {
            const course = allCourses.find(c => c.classes?.some(cl => cl.id === id));
            targetCourseId = course?.id || null;
        } else if (level === 'module') {
            const course = allCourses.find(c => c.modules?.some(m => m.id === id));
            targetCourseId = course?.id || null;
        } else if (level === 'discipline') {
            const course = allCourses.find(c => c.modules?.some(m => m.disciplines?.some(d => d.id === id)));
            targetCourseId = course?.id || null;
        }

        const studentsInScope = targetCourseId
            ? allCourses.find(c => c.id === targetCourseId)?.classes?.flatMap(cl => cl.students || []) || []
            : [];
        
        result.studentCount = studentsInScope.length;
        if (studentsInScope.length === 0) {
            return result; // No students, no analytics.
        }

        // Step 3: Fetch contextual performance for each student in scope using a dedicated RPC.
        const performancePromises = studentsInScope.map(student => 
            getStudentPerformanceInContext(student.id, { level, contentId: id })
        );
        const performances = (await Promise.all(performancePromises)).filter(Boolean) as StudentContextualPerformance[];
        
        // Step 4: Aggregate the results from all students.
        let totalTestScore = 0;
        let totalAttemptsCount = 0;
        let totalFlashcardAccuracySum = 0;
        let flashcardStudentsCount = 0;

        const studentAnalyticsMap = new Map<string, { id: string; name: string; testAverage: number; flashcardAccuracy: number; }>();
        const testAnalyticsMap = new Map<string, { id: string; name: string; totalScore: number; count: number; }>();

        performances.forEach((p, index) => {
            const student = studentsInScope[index];
            if (!student) return;

            studentAnalyticsMap.set(student.id, {
                id: student.id,
                name: student.name,
                testAverage: p.studentTestAverage,
                flashcardAccuracy: p.studentFlashcardAccuracy,
            });

            p.testAttempts.forEach(attempt => {
                totalTestScore += attempt.score;
                totalAttemptsCount++;
                
                if (!attempt.tests) return;
                const testId = attempt.test_id;
                if (!testAnalyticsMap.has(testId)) {
                    testAnalyticsMap.set(testId, { id: testId, name: attempt.tests.name, totalScore: 0, count: 0 });
                }
                const stats = testAnalyticsMap.get(testId)!;
                stats.totalScore += attempt.score;
                stats.count++;
            });

            if (p.studentFlashcardAccuracy > 0 || p.flashcardSessions.length > 0) {
                totalFlashcardAccuracySum += p.studentFlashcardAccuracy;
                flashcardStudentsCount++;
            }
            
            // FIX: The ContentAnalyticsData.flashcardSessions type requires a `students` property on each session.
            // Map over the sessions for the current student and add their name.
            result.flashcardSessions.push(...p.flashcardSessions.map(session => ({
                ...session,
                students: { name: student.name }
            })));
        });

        // Step 5: Final calculations
        result.averageScore = totalAttemptsCount > 0 ? Math.round(totalTestScore / totalAttemptsCount) : 0;
        result.averageFlashcardAccuracy = flashcardStudentsCount > 0 ? Math.round(totalFlashcardAccuracySum / flashcardStudentsCount) : 0;
        
        result.students = Array.from(studentAnalyticsMap.values()).sort((a, b) => b.testAverage - a.testAverage);
        result.tests = Array.from(testAnalyticsMap.values()).map(t => ({
            id: t.id,
            name: t.name,
            average: t.count > 0 ? Math.round(t.totalScore / t.count) : 0,
        })).sort((a,b) => a.name.localeCompare(b.name));
        
        result.testCount = testAnalyticsMap.size;
        result.flashcardSessionCount = result.flashcardSessions.length;

        // Step 6: Fetch and filter recent activity log.
        const getDescendantSetNames = (level: string, id: string, courses: any[]): string[] => {
            const sets: any[] = [];
            const findCourse = (courseId: string) => courses.find(c => c.id === courseId);
            const findModule = (moduleId: string) => courses.flatMap(c => c.modules || []).find(m => m.id === moduleId);
            const findDiscipline = (disciplineId: string) => courses.flatMap(c => c.modules || []).flatMap(m => m.disciplines || []).find(d => d.id === disciplineId);

            if (level === 'course' || level === 'class') { // Classes inherit from their course
                const course = level === 'course' ? findCourse(id) : courses.find(c => c.classes?.some(cl => cl.id === id));
                course?.modules?.forEach(module => {
                    module.disciplines?.forEach(discipline => {
                        sets.push(...(discipline.question_sets || []));
                    });
                });
            } else if (level === 'module') {
                const module = findModule(id);
                module?.disciplines?.forEach(discipline => {
                    sets.push(...(discipline.question_sets || []));
                });
            } else if (level === 'discipline') {
                const discipline = findDiscipline(id);
                if (discipline) sets.push(...(discipline.question_sets || []));
            }
            return sets.map(s => s.subjectName);
        };
        
        const relevantSubjectNames = getDescendantSetNames(level, id, allCourses);

        if ((level === 'module' || level === 'discipline') && relevantSubjectNames.length === 0) {
            // If viewing a module/discipline with no content, it can't have relevant activities.
            result.activityLog = [];
        } else {
            let activityQuery = supabase
                .from('student_activity_log')
                .select('*, students(name)')
                .in('student_id', studentsInScope.map(s => s.id));

            if (relevantSubjectNames.length > 0) {
                const filterPatterns = relevantSubjectNames.map(name => `description.ilike.%${name}%`).join(',');
                activityQuery = activityQuery.or(filterPatterns);
            }

            const { data: activityLog, error: activityError } = await activityQuery
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (activityError) throw activityError;
            // FIX: Cast to a more specific type instead of `any` to improve type safety.
            result.activityLog = (activityLog || []) as (ContentAnalyticsData['activityLog']);
        }

    } catch (error: any) {
        console.error(`Error calculating analytics for ${level} ${id}:`, error.message || error);
        // Return an empty but valid object to prevent UI crashes
        return {
            studentCount: 0, testCount: 0, averageScore: 0, flashcardSessionCount: 0, averageFlashcardAccuracy: 0,
            students: [], tests: [], flashcardSessions: [], activityLog: [],
        };
    }

    return result;
};


export const getStudentPerformanceInContext = async (
    studentId: string,
    context: { level: 'course' | 'module' | 'discipline' | 'class', contentId: string }
): Promise<StudentContextualPerformance | null> => {
    try {
        const { data, error } = await supabase.rpc('get_student_performance_in_context', {
            p_student_id: studentId,
            p_level: context.level,
            p_content_id: context.contentId,
        });

        if (error) {
            console.error("Error fetching student contextual performance from RPC:", error.message || error);
            return null;
        }
        
        const resultData = Array.isArray(data) ? data[0] : data;

        return resultData as StudentContextualPerformance;

    } catch (error: any) {
        console.error("Client-side error in getStudentPerformanceInContext:", error.message || error);
        return null;
    }
};

export const getStudentComprehensiveAnalytics = async (studentId: string): Promise<StudentAnalytics | null> => {
    try {
        const { data, error } = await supabase.rpc('get_student_comprehensive_analytics', { p_student_id: studentId });
        
        if (error) {
            console.error("Error fetching student comprehensive analytics from RPC:", error.message || error);
            return null;
        }

        const resultData = Array.isArray(data) ? data[0] : data;

        if (!resultData) {
            return null;
        }
        
        return {
            ...resultData,
            strengths: resultData.strengths || [],
            weaknesses: resultData.weaknesses || [],
            recentActivity: resultData.recentActivity || [],
        };

    } catch (error: any) {
        console.error("Client-side error in getStudentComprehensiveAnalytics:", error.message || error);
        return null;
    }
};