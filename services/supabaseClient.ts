import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxlpstolzrhvhwvzalww.supabase.co';
// The anon public key is safe to be exposed in a client-side app.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4bHBzdG9senJodmh3dnphbHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMjc2MDIsImV4cCI6MjA3ODkwMzYwMn0.2YYuRmqItO2XNG0m-homw9PjElNPy3yGErTl212MjO0';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
