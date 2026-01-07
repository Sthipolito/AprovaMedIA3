
import { supabase } from './supabaseClient';
import { MarketplaceItem } from '../types';
import * as studyLibraryService from './studyLibraryService';

export const getMarketplaceItems = async (): Promise<MarketplaceItem[]> => {
    const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching marketplace items:", error);
        return [];
    }
    return data as MarketplaceItem[];
};

export const addMarketplaceItem = async (item: Omit<MarketplaceItem, 'id'>): Promise<MarketplaceItem | null> => {
    const { data, error } = await supabase
        .from('marketplace_items')
        .insert(item)
        .select()
        .single();

    if (error) {
        console.error("Error adding marketplace item:", error);
        return null;
    }
    return data as MarketplaceItem;
};

export const deleteMarketplaceItem = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting marketplace item:", error);
        return false;
    }
    return true;
};

export const purchaseItem = async (studentId: string, itemId: string): Promise<boolean> => {
    // 1. Record the purchase
    const { error: purchaseError, data: itemData } = await supabase
        .from('student_purchases')
        .insert({ student_id: studentId, item_id: itemId })
        .select('*, marketplace_items(content_id, content_type)')
        .single();

    if (purchaseError) {
        // Check for duplicate purchase
        if (purchaseError.code === '23505') return true;
        console.error("Error processing purchase:", purchaseError);
        return false;
    }

    // 2. Deliver the content (Add to Library)
    const contentId = itemData?.marketplace_items?.content_id;
    const contentType = itemData?.marketplace_items?.content_type;

    if (contentId && contentType === 'question_set') {
        await studyLibraryService.addToLibrary(studentId, contentId);
    }
    // If course, different logic would apply, but for now we focus on question_sets

    return true;
};
