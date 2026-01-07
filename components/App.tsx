
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import TeacherApp from './components/TeacherApp';
import * as academicService from './services/academicService';
import { Student } from './types';
import { UserProvider } from './contexts/UserContext';

// pdf.js worker configuration
import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs');

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [studentProfile, setStudentProfile] = useState<Student | null>(null);
    const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Use a ref to track the last user ID.
    const lastUserId = useRef<string | undefined>(undefined);

    useEffect(() => {
        const checkUserRole = async (session: Session | null) => {
            lastUserId.current = session?.user?.id;

            if (session?.user) {
                try {
                    const userId = session.user.id;
                    const userEmail = session.user.email?.toLowerCase() || '';
                    
                    // Emails hardcoded para admin/fallback (garante acesso imediato)
                    const adminEmails = [
                        'aprovamedia@gmail.com', 
                        'omaestrodaia@gmail.com',
                        'ellatellesmed@gmail.com'
                    ];

                    // 1. Verifica tabela de Professores/Admins E Alunos
                    const [student, teacher] = await Promise.all([
                        academicService.getStudentProfile(userId),
                        academicService.getTeacherProfile(userId)
                    ]);

                    // 2. Lógica de Decisão de Acesso e Auto-Correção
                    if (teacher) {
                        // Professor confirmado no banco
                        console.log("Acesso: Professor/Admin (Banco)");
                        setUserRole('teacher');
                        setStudentProfile(null);
                    } else if (adminEmails.includes(userEmail)) {
                        // Usuário é admin por email, mas não está no banco 'teachers'. Corrigir isso.
                        console.log("Acesso: Admin (Email Whitelist) - Criando perfil no banco...");
                        const name = session.user.user_metadata?.full_name || 'Admin';
                        await academicService.ensureTeacherProfile(userId, userEmail, name);
                        setUserRole('teacher');
                        setStudentProfile(null);
                    } else if (student) {
                        console.log("Acesso: Aluno");
                        setStudentProfile(student);
                        setUserRole('student');
                    } else {
                        console.warn("Acesso negado: Usuário sem perfil.");
                        alert("Atenção: Seu usuário não possui perfil de Aluno ou Professor. Contate o suporte.");
                        setStudentProfile(null);
                        setUserRole(null);
                        await supabase.auth.signOut();
                    }
                } catch (error) {
                    console.error("Erro crítico ao verificar permissões:", error);
                    setStudentProfile(null);
                    setUserRole(null);
                }
            } else {
                setStudentProfile(null);
                setUserRole(null);
            }
            setSession(session);
            setLoading(false);
        };

        // Verifica sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUserRole(session);
        });

        // Escuta mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'TOKEN_REFRESHED') return;
            if (newSession?.user?.id === lastUserId.current) {
                setSession(newSession);
                return;
            }
            setLoading(true);
            checkUserRole(newSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 font-medium">Carregando AprovaMed IA...</p>
                </div>
            </div>
        );
    }
    
    if (!session) {
        return <AuthPage />;
    }

    return (
        <UserProvider>
            <div className="h-screen w-screen overflow-hidden bg-gray-100">
                {userRole === 'student' && studentProfile ? (
                    <StudentApp session={session} studentProfile={studentProfile} />
                ) : userRole === 'teacher' ? (
                    <TeacherApp />
                ) : (
                     <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
                            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-xl font-bold text-gray-800">Verificando Acesso...</h2>
                            <p className="mt-2 text-gray-600">Aguarde enquanto validamos seu perfil.</p>
                        </div>
                    </div>
                )}
            </div>
        </UserProvider>
    );
};

export default App;
