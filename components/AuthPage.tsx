import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import * as academicService from '../services/academicService';
import { Course, Class } from '../types';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        academicService.getCourses().then(setCourses);
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            academicService.getClasses(selectedCourseId).then(setClasses);
            setSelectedClassId('');
        }
    }, [selectedCourseId]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // The onAuthStateChange listener in App.tsx will handle the redirect
            } else {
                if (!name || !selectedClassId || !email || !password) {
                    throw new Error("Por favor, preencha todos os campos obrigatórios.");
                }
                // REFACTOR: Use the atomic addStudent function which calls an RPC to create the
                // auth user and the student profile in a single transaction. This prevents the
                // race condition where a profile fails to be created and the user is later
                // misidentified as a teacher.
                await academicService.addStudent(selectedClassId, name, email, password);
                
                setMessage('Cadastro realizado! Por favor, verifique seu e-mail para confirmar sua conta e poder fazer o login.');
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";


    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
                <img src={logoUrl} alt="AprovaMed IA Logo" className="w-full h-auto mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                    {isLogin ? 'Bem-vindo de volta!' : 'Crie sua Conta de Aluno'}
                </h2>
                <p className="text-center text-gray-500 mb-6 text-sm">
                    {isLogin ? 'Acesse sua conta para continuar seus estudos.' : 'Preencha os dados para iniciar sua jornada.'}
                </p>

                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
                {message && <p className="bg-green-100 text-green-700 p-3 rounded-md text-sm mb-4">{message}</p>}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <>
                            <input type="text" placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:outline-none" />
                            <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none">
                                <option value="">Selecione seu Curso</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                             <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none" disabled={!selectedCourseId}>
                                <option value="">Selecione sua Turma</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </>
                    )}
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:outline-none" />
                    <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-white text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:outline-none" />
                    <button type="submit" disabled={loading} className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:bg-gray-400">
                        {loading ? 'Carregando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                    <button onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }} className="font-semibold text-primary hover:underline ml-1">
                        {isLogin ? 'Cadastre-se' : 'Faça login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;