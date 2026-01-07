
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import TeacherApp from './components/TeacherApp';
import SubscriptionPage from './components/SubscriptionPage';
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
    
    // Use a ref to track the last user ID to prevent reloads on window focus
    const lastUserId = useRef<string | undefined>(undefined);

    const checkUserRole = async (session: Session | null) => {
        // Atualiza a ref imediatamente para evitar loops se o listener disparar novamente
        lastUserId.current = session?.user?.id;

        if (session?.user) {
            try {
                const userId = session.user.id;
                const userEmail = session.user.email?.toLowerCase() || '';
                
                // Emails hardcoded para admin/fallback
                const adminEmails = [
                    'aprovamedia@gmail.com', 
                    'omaestrodaia@gmail.com',
                    'ellatellesmed@gmail.com'
                ];

                let student: Student | null = null;
                let teacher: { id: string; name: string } | null = null;
                let attempts = 0;
                const maxAttempts = 5; // Tenta por aprox. 5 a 7 segundos

                // Loop de Retry: Aguarda a criação do perfil no banco (Race Condition Fix)
                while (attempts < maxAttempts) {
                    const [s, t] = await Promise.all([
                        academicService.getStudentProfile(userId),
                        academicService.getTeacherProfile(userId)
                    ]);

                    if (s || t) {
                        student = s;
                        teacher = t;
                        break; // Encontrou, sai do loop
                    }

                    // Se for admin hardcoded, não precisa esperar o banco
                    if (adminEmails.includes(userEmail)) {
                        break;
                    }

                    // Aguarda 1.5s antes da próxima tentativa
                    console.log(`Perfil não encontrado. Tentativa ${attempts + 1}/${maxAttempts}... aguardando sincronização.`);
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    attempts++;
                }

                if (teacher) {
                    console.log("Acesso: Professor/Admin (Banco)");
                    setUserRole('teacher');
                    setStudentProfile(null);
                } else if (adminEmails.includes(userEmail)) {
                    console.log("Acesso: Admin (Email Whitelist)");
                    const name = session.user.user_metadata?.full_name || 'Admin';
                    await academicService.ensureTeacherProfile(userId, userEmail, name);
                    setUserRole('teacher');
                    setStudentProfile(null);
                } else if (student) {
                    console.log("Acesso: Aluno");
                    setStudentProfile(student);
                    setUserRole('student');
                } else {
                    console.warn("Acesso negado: Usuário sem perfil após tentativas.");
                    // Não desloga imediatamente para evitar flash se for apenas lag extremo, 
                    // mas mostra a tela de espera/erro
                    setStudentProfile(null);
                    setUserRole(null);
                    // Opcional: Deslogar se realmente falhar após todas as tentativas
                    if (attempts >= maxAttempts) {
                         alert("Não foi possível encontrar seu perfil de aluno. Se você acabou de se cadastrar, tente fazer login novamente.");
                         await supabase.auth.signOut();
                    }
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

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUserRole(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            if (event === 'TOKEN_REFRESHED') return;
            
            // CORREÇÃO: Removemos a dependência de 'userRole' aqui.
            // Se o ID do usuário da nova sessão for o mesmo do anterior (armazenado em lastUserId),
            // apenas atualizamos o token da sessão sem disparar o loading (que desmonta a tela).
            if (newSession?.user?.id && newSession.user.id === lastUserId.current) {
                setSession(newSession);
                return;
            }

            // Se for logout, limpa tudo
            if (event === 'SIGNED_OUT') {
                lastUserId.current = undefined;
                setSession(null);
                setStudentProfile(null);
                setUserRole(null);
                setLoading(false);
                return;
            }

            // Apenas mostra loading e verifica roles se for um usuário DIFERENTE ou login novo
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

    // Paywall Logic
    const isStudentActive = studentProfile?.subscription_status === 'active';

    return (
        <UserProvider>
            <div className="h-screen w-screen overflow-hidden bg-gray-100">
                {userRole === 'student' && studentProfile ? (
                    isStudentActive ? (
                        <StudentApp session={session} studentProfile={studentProfile} />
                    ) : (
                        <SubscriptionPage 
                            student={studentProfile} 
                            onSuccess={() => window.location.reload()} 
                        />
                    )
                ) : userRole === 'teacher' ? (
                    <TeacherApp />
                ) : (
                     <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                        <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <h2 className="text-xl font-bold text-gray-800">Verificando Acesso...</h2>
                            <p className="mt-2 text-gray-600">Finalizando a criação da sua conta.</p>
                        </div>
                    </div>
                )}
            </div>
        </UserProvider>
    );
};

export default App;
