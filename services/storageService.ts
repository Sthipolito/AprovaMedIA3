import { supabase } from './supabaseClient';

const BUCKET_NAME = 'media-assets';

/**
 * Uploads an image file to the Supabase storage bucket.
 * @param file The image file to upload (e.g., from an <input type="file">).
 * @returns A promise that resolves to the public URL of the uploaded image, or null on failure.
 */
export const uploadImage = async (file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return data.publicUrl;

    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
};
