// ACCOUNT SCREEN
// Shows who is signed in, and lets them sign out.

import {useEffect, useState} from 'react';
import {Pressable, Text} from 'react-native';
import ScreenShell from '@/components/ScreenShell';
import {authStyles as styles} from '@/constants/styles';
import {fetchMyAccount, signOut, type Account} from '@/lib/accounts';

export default function AccountScreen() {
    const [account, setAccount] = useState<Account | null>(null);

    // Load the signed-in user's account row once, when the screen opens
    useEffect(() => {
        fetchMyAccount().then(setAccount).catch((e) => console.error('Could not load account:', e));
    }, []);

    return (
        <ScreenShell title="Account">
            {account && <Text style={styles.accountName}>{account.username}</Text>}
            <Pressable style={styles.secondaryButton} onPress={() => signOut().catch((e) => console.error('Sign-out failed:', e))}>
                <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
        </ScreenShell>
    );
}
