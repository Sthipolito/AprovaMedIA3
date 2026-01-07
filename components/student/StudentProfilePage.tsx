import React from 'react';
import { Student } from '../../types';

interface StudentProfilePageProps {
    student: Student;
}

const ProfileField: React.FC<{ label: string, value: string | undefined }> = ({ label, value }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
    </div>
);

const StudentProfilePage: React.FC<StudentProfilePageProps> = ({ student }) => {
    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800">Meu Perfil</h1>
                <p className="text-gray-500 mt-1">Suas informações de cadastro na plataforma.</p>
            </header>

            <main className="flex-grow p-6">
                <div className="bg-white max-w-2xl mx-auto p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center space-x-4 mb-6">
                         {student.image_url ? (
                            <img src={student.image_url} alt={student.name} className="w-20 h-20 rounded-full object-cover" />
                        ) : (
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-4xl font-bold text-primary">{student.name.charAt(0)}</span>
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold">{student.name}</h2>
                            <p className="text-gray-500">Aluno</p>
                        </div>
                    </div>
                     <dl className="divide-y divide-gray-200">
                        <ProfileField label="Nome Completo" value={student.name} />
                        <ProfileField label="Curso" value={student.classes?.courses?.name} />
                        <ProfileField label="Turma" value={student.classes?.name} />
                        <ProfileField label="Data de Inscrição" value={new Date(student.created_at).toLocaleDateString()} />
                     </dl>
                </div>
            </main>
        </div>
    );
};

export default StudentProfilePage;
