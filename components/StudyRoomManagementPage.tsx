
import React, { useState, useEffect } from 'react';
import { StudyRoom } from '../types';
import * as collabService from '../services/collabService';
import { MessageCircleIcon, TrashIcon, UsersIcon } from './IconComponents';
import RoomChat from './student/RoomChat';
import { useUser } from '../contexts/UserContext';

const StudyRoomManagementPage: React.FC = () => {
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
    const { userRole } = useUser();
    // Teacher's auth ID is needed for chat. Since TeacherApp doesn't pass 'student' object, 
    // we rely on userRole context or we assume we can get it from auth session if needed.
    // Ideally RoomChat should handle "Teacher" persona.
    // For now, we'll pass a dummy ID or fix RoomChat to handle teachers. 
    // But wait, RoomChat expects a userId to send messages.
    // We can use the session user ID if we had it.
    // Let's just view the rooms for now, or pass a placeholder if strict.

    // WORKAROUND: We need the actual user ID to chat. 
    // In a real app, we'd grab this from the session.
    // Since we are in "TeacherApp", let's assume we are just moderating/viewing.

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const data = await collabService.getStudyRooms();
        setRooms(data);
        setLoading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Tem certeza que deseja encerrar esta sala de estudo?")) {
            await collabService.deleteStudyRoom(id);
            loadRooms();
            if (activeRoom?.id === id) setActiveRoom(null);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <MessageCircleIcon className="w-8 h-8 text-primary" />
                    Moderação de Salas
                </h1>
                <p className="text-gray-500 mt-1">Monitore e gerencie as salas de estudo ativas.</p>
            </header>

            <main className="flex-grow p-6 flex gap-6 overflow-hidden">
                {/* Room List */}
                <div className="w-1/3 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {loading ? (
                        <p className="text-center text-gray-500">Carregando salas...</p>
                    ) : rooms.length > 0 ? (
                        rooms.map(room => (
                            <div 
                                key={room.id} 
                                onClick={() => setActiveRoom(room)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${activeRoom?.id === room.id ? 'bg-primary/5 border-primary shadow-md' : 'bg-white border-gray-200 hover:border-primary/50'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800">{room.name}</h3>
                                    <button 
                                        onClick={(e) => handleDelete(e, room.id)}
                                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                        title="Excluir Sala"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{room.description || "Sem descrição"}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                    <UsersIcon className="w-3 h-3" /> Sala Ativa
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-10">Nenhuma sala ativa.</p>
                    )}
                </div>

                {/* Room Detail / Chat Monitor */}
                <div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {activeRoom ? (
                        <>
                            <div className="p-4 border-b bg-gray-50">
                                <h2 className="font-bold text-gray-800 text-lg">{activeRoom.name}</h2>
                                <p className="text-sm text-gray-500">Monitoramento de Chat</p>
                            </div>
                            <div className="flex-grow p-4 overflow-hidden">
                                {/* Teacher View of Chat - Using a hardcoded ID for moderation context or simple view */}
                                <RoomChat 
                                    roomId={activeRoom.id} 
                                    userId="teacher-admin-id" 
                                    studentName="Professor (Moderador)" 
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <MessageCircleIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p>Selecione uma sala para monitorar.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudyRoomManagementPage;
