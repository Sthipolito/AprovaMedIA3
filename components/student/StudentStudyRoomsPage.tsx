
import React, { useState, useEffect } from 'react';
import { Student, StudyRoom } from '../../types';
import * as collabService from '../../services/collabService';
import { MessageCircleIcon, PlusCircleIcon, UsersIcon, XIcon } from '../IconComponents';
import RoomChat from './RoomChat';

interface StudentStudyRoomsPageProps {
    student: Student;
}

const StudentStudyRoomsPage: React.FC<StudentStudyRoomsPageProps> = ({ student }) => {
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomDesc, setNewRoomDesc] = useState('');

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const data = await collabService.getStudyRooms();
        setRooms(data);
        setLoading(false);
    };

    const handleCreateRoom = async () => {
        if (!newRoomName.trim()) return;
        await collabService.createStudyRoom(newRoomName, newRoomDesc, student.id);
        setIsCreateModalOpen(false);
        setNewRoomName('');
        setNewRoomDesc('');
        loadRooms();
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <MessageCircleIcon className="w-8 h-8 text-primary" />
                            Salas de Estudo
                        </h1>
                        <p className="text-gray-500 mt-1">Conecte-se com outros alunos e estude em grupo.</p>
                    </div>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" /> Criar Sala
                    </button>
                </div>
            </header>

            <main className="flex-grow p-6">
                {activeRoom ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">{activeRoom.name}</h2>
                                <p className="text-sm text-gray-500">{activeRoom.description}</p>
                            </div>
                            <button onClick={() => setActiveRoom(null)} className="text-sm text-gray-600 hover:underline">
                                Sair da Sala
                            </button>
                        </div>
                        <div className="p-4 flex-grow overflow-hidden">
                            <RoomChat roomId={activeRoom.id} userId={student.id} studentName={student.name} />
                        </div>
                    </div>
                ) : (
                    <>
                        {loading ? (
                            <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                        ) : rooms.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rooms.map(room => (
                                    <button 
                                        key={room.id} 
                                        onClick={() => setActiveRoom(room)}
                                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-primary transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-primary/10 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <UsersIcon className="w-6 h-6" />
                                            </div>
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">Ativa</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">{room.name}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2">{room.description || "Sem descrição."}</p>
                                        <div className="mt-4 pt-4 border-t text-sm text-primary font-semibold flex items-center gap-2">
                                            Entrar na Sala &rarr;
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <MessageCircleIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h2 className="text-xl font-semibold">Nenhuma sala de estudo ativa</h2>
                                <p className="mt-2">Crie uma nova sala para começar a colaborar!</p>
                            </div>
                        )}
                    </>
                )}
            </main>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Criar Sala de Estudo</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Nome da Sala (ex: Grupo de Anatomia)" 
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            className="w-full p-3 border rounded-lg mb-3"
                        />
                        <textarea 
                            placeholder="Descrição (opcional)" 
                            value={newRoomDesc}
                            onChange={e => setNewRoomDesc(e.target.value)}
                            className="w-full p-3 border rounded-lg mb-4 h-24 resize-none"
                        />
                        <button 
                            onClick={handleCreateRoom}
                            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark"
                        >
                            Criar Sala
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentStudyRoomsPage;
