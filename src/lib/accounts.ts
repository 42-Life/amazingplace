// ACCOUNTS
// Sign up, sign in, sign out, and look up the signed-in user's row in the `accounts` table.
// Every other table links to accounts.id, not to the auth user's id.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';


// ACCOUNT TYPE
// One row of the accounts table
export type Account = {
    id: string
    username: string
}


// SIGN UP
// Creates the login. A database trigger then creates the matching accounts row
// from the username we pass along here (see supabase/accounts.sql).
// Returns true if the user is signed in right away, false if they must confirm their email first.
export async function signUp(email: string, password: string, username: string): Promise<boolean> {
    // STEP 1: Clean up and check the inputs
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) throw new Error('Username must be 3 to 20 characters.');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');

    // STEP 2: Create the login, with the username attached for the trigger to read
    const {data, error} = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {data: {username: cleanUsername}},
    });

    // STEP 3: A taken username makes the trigger fail, which Supabase reports as a generic database error
    if (error?.message.includes('Database error')) throw new Error('That username is already taken.');
    if (error) throw error;

    // STEP 4: With email confirmation turned on, there is no session until they click the email link
    return data.session !== null;
}


// SIGN IN
export async function signIn(email: string, password: string): Promise<void> {
    const {error} = await supabase.auth.signInWithPassword({email: email.trim(), password});
    if (error) throw error;
}


// SIGN OUT
export async function signOut(): Promise<void> {
    const {error} = await supabase.auth.signOut();
    if (error) throw error;
}


// FETCH MY ACCOUNT
// Gets the signed-in user's accounts row, or null if nobody is signed in
export async function fetchMyAccount(): Promise<Account | null> {
    // STEP 1: Get the signed-in user
    const {data: {session}} = await supabase.auth.getSession();
    if (!session?.user) return null;

    // STEP 2: Find the accounts row that belongs to that login
    const {data, error} = await supabase
        .from('accounts')
        .select('id, username')
        .eq('auth_user_id', session.user.id)
        .single();
    if (error) throw error;
    return data as Account;
}
