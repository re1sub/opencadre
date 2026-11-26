import { createClient } from "@supabase/supabase-js";
import type { Database } from "#/types/database";

const supabaseUrl = import.meta.env.SUPABASE_PUBLIC_URL;
const supabaseKey = import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
