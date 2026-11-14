-- Triggers on Supabase's built-in auth tables.

-- Creates an accounts row (see handle_new_user in functions.sql) when someone signs up.
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
