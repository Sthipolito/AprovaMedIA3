import React from 'react';
import { Student } from '../../types';
import { LayersIcon } from '../IconComponents';

interface StudentTrueFlashcardsPageProps {
    student: Student;
}

const StudentTrueFlashcardsPage: React.FC<StudentTrueFlashcardsPageProps> = ({ student }) => {
    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800">Flashcards</h1>
                <p className="text-gray-500 mt-1">Estude com flashcards de pergunta e resposta para memorizar conceitos chave.</p>
            </header>
            <main className="flex-grow p-6 flex items-center justify-center">
                 <div className="text-center text-gray-500">
                    <LayersIcon className="w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold">Funcionalidade em Desenvolvimento</h2>
                    <p className="mt-2">Em breve, você poderá estudar com os novos flashcards de pergunta/resposta.</p>
                </div>
            </main>
        </div>
    );
};

export default StudentTrueFlashcardsPage;
