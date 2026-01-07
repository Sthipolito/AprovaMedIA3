
import React, { useState, useEffect, useRef } from 'react';
import { RoomMessage } from '../../types';
import { SendHorizIcon, UserIcon } from '../IconComponents';
import * as collabService from '../../services/collabService';

interface RoomChatProps {
    roomId: string;
    userId: string;
    studentName: string;
}

const RoomChat: React.FC<RoomChatProps> = ({ roomId, userId, studentName }) => {
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        const msgs = await collabService.getRoomMessages(roomId);
        setMessages(msgs);
    };

    useEffect(() => {
        loadMessages();
        // Poll for new messages every 5 seconds (Simple realtime alternative)
        const interval = setInterval(loadMessages, 5000);
        return () => clearInterval(interval);
    }, [roomId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        
        // Optimistic update
        const tempId = Date.now().toString();
        const tempMsg: any = {
            id: tempId,
            room_id: roomId,
            user_id: userId,
            content: newMessage,
            created_at: new Date().toISOString(),
            student: { name: studentName }
        };
        
        setMessages(prev => [...prev, tempMsg]);
        const textToSend = newMessage;
        setNewMessage('');

        await collabService.sendMessage(roomId, userId, textToSend);
        loadMessages(); // Refresh to get true ID/timestamp
    };

    return (
        <div className="flex flex-col h-[500px] bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.user_id === userId;
                    return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                                {!isMe && <p className="text-[10px] font-bold text-primary mb-1">{msg.student?.name}</p>}
                                <p className="text-sm">{msg.content}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
            <div className="p-3 bg-white border-t">
                <form 
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex gap-2"
                >
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
                    >
                        <SendHorizIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RoomChat;
