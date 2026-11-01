// Capa de servicios: conexión con la base de datos Supabase

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmvwvkiaabomaamsxlxv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2eQ7eNN7lrzerKjVRmVCGg_l47NAZm2';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
