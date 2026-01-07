
import { supabase } from './supabaseClient';
import { StudyRoom, RoomMessage } from '../types';

export const getStudyRooms = async (): Promise<StudyRoom[]> => {
    const { data, error } = await supabase
        .from('study_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching study rooms:", error);
        return [];
    }
    return data as StudyRoom[];
};

export const createStudyRoom = async (name: string, description: string, createdBy: string): Promise<StudyRoom | null> => {
    const { data, error } = await supabase
        .from('study_rooms')
        .insert({ name, description, created_by: createdBy })
        .select()
        .single();
    
    if (error) {
        console.error("Error creating study room:", error);
        return null;
    }
    return data as StudyRoom;
};

export const deleteStudyRoom = async (roomId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('study_rooms')
        .delete()
        .eq('id', roomId);

    if (error) {
        console.error("Error deleting study room:", error);
        return false;
    }
    return true;
};

export const getRoomMessages = async (roomId: string): Promise<RoomMessage[]> => {
    const { data, error } = await supabase
        .from('room_messages')
        .select('*, students(name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching messages:", error);
        return [];
    }

    // Map to flatten structure
    return data.map((msg: any) => ({
        ...msg,
        student: { name: msg.students?.name || 'Unknown' }
    }));
};

export const sendMessage = async (roomId: string, userId: string, content: string): Promise<boolean> => {
    const { error } = await supabase
        .from('room_messages')
        .insert({ room_id: roomId, user_id: userId, content });

    if (error) {
        console.error("Error sending message:", error);
        return false;
    }
    return true;
};
