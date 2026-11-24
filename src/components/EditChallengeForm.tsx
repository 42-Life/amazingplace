import {useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import TextInput from '@/components/KeyboardTextInput';
import DateSelector from '@/components/explore/DateSelector';
import ChallengeAreaMap from '@/components/ChallengeAreaMap';
import {deleteChallenge, updateChallenge} from '@/lib/challenges';
import {DEFAULT_VOTING_DAYS, addDays, formatChallengeDate, getChallengeDate, getVotingStartDate} from '@/utils/challenge-dates';
import type {ChallengeLocation, ChallengeTagId} from '@/constants/types';
import {createChallengeStyles as formStyles} from '@/constants/styles';
import {theme} from '@/constants/theme';
import ChallengeTagPicker from '@/components/ChallengeTagPicker';

// onClose: back out, or done saving. onDeleted: the challenge is gone, so the page that
// opened this form (its stats page) has nothing left to show.
export default function EditChallengeForm({challenge, onClose, onDeleted}: {challenge: ChallengeLocation; onClose: () => void; onDeleted: () => void}) {
    const [title, setTitle] = useState(challenge.title);
    const [description, setDescription] = useState(challenge.description ?? '');
    const [startAt, setStartAt] = useState(challenge.start_at);
    const [endAt, setEndAt] = useState(challenge.end_at);
    const [votingEndAt, setVotingEndAt] = useState(challenge.voting_end_at);
    const [latitude, setLatitude] = useState(String(challenge.latitude));
    const [longitude, setLongitude] = useState(String(challenge.longitude));
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tags, setTags] = useState<ChallengeTagId[]>(
        challenge.tags ?? []
    );

    const today = getChallengeDate();
    const canChangeStartAndLocation = challenge.start_at > today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minimumEnd = startAt > getChallengeDate(tomorrow) ? startAt : getChallengeDate(tomorrow);
    // Each end date locks once its period is over (the database enforces this too)
    const canChangeEnd = challenge.end_at >= today;
    const canChangeVotingEnd = challenge.voting_end_at >= today;
    // Voting starts the day after entries close, and can't be moved to end in the past
    const votingStart = getVotingStartDate({end_at: endAt});
    const minimumVotingEnd = votingStart > today ? votingStart : today;

    // Moving the entry end date past the voting end date pushes voting back to keep its default length
    const changeEndAt = (value: string) => {
        setEndAt(value);
        if (value && votingEndAt <= value) setVotingEndAt(addDays(value, DEFAULT_VOTING_DAYS));
    };
    const coordinate = {latitude: Number(latitude), longitude: Number(longitude)};
    const validCoordinate = latitude.trim() !== '' && longitude.trim() !== ''
        && Number.isFinite(coordinate.latitude) && Math.abs(coordinate.latitude) <= 90
        && Number.isFinite(coordinate.longitude) && Math.abs(coordinate.longitude) <= 180;

    async function save() {
        if (busy) return;
        setError(null);
        if (canChangeStartAndLocation && !validCoordinate) {
            setError('Enter valid latitude and longitude coordinates.');
            return;
        }
        setBusy(true);
        try {
            await updateChallenge(challenge.id, {
                title, description, tags,
                ...(canChangeEnd ? {end_at: endAt} : {}),
                ...(canChangeVotingEnd ? {voting_end_at: votingEndAt} : {}),
                ...(canChangeStartAndLocation ? {start_at: startAt, ...coordinate} : {}),
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save this challenge.');
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            await deleteChallenge(challenge.id);
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete this challenge.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <SafeAreaView style={formStyles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onClose} disabled={busy} style={styles.back}>
                    <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
                </Pressable>
                <Text style={formStyles.title}>Edit challenge</Text>
            </View>
            <KeyboardAvoidingView style={formStyles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={formStyles.formContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                    <View pointerEvents={busy ? 'none' : 'auto'} style={styles.fields}>
                        <Text style={formStyles.label}>Title</Text>
                        <TextInput accessibilityLabel="Challenge title" value={title} onChangeText={setTitle} maxLength={80} style={formStyles.input} />
                        <Text style={formStyles.label}>Description</Text>
                        <TextInput accessibilityLabel="Challenge description" value={description} onChangeText={setDescription} maxLength={500} multiline style={[formStyles.input, formStyles.inputMultiline]} />

                        {/* TODO: Check if formStyles.label is fine for categories */}
                        <Text style={formStyles.label}>Categories</Text>

                        <ChallengeTagPicker
                            value={tags}
                            onChange={setTags}
                            disabled={busy}
                        />

                        <Text style={formStyles.label}>Entries</Text>
                        <Text style={formStyles.reviewValue}>{challenge.media_type === 'video' ? 'Videos (up to 30 seconds)' : 'Photos'}</Text>
                        <Text style={formStyles.hint}>Whether entries are photos or videos can’t be changed after a challenge is created.</Text>

                        <Text style={formStyles.label}>Start date</Text>
                        {canChangeStartAndLocation
                            ? <DateSelector label="Start date" value={startAt} onChange={setStartAt} minimumDate={today} />
                            : <Text style={formStyles.reviewValue}>{new Date(`${startAt}T12:00:00`).toLocaleDateString()}</Text>}
                        <Text style={formStyles.label}>Entries close</Text>
                        {canChangeEnd ? <>
                            <DateSelector label="Entries close" value={endAt} onChange={changeEndAt} minimumDate={minimumEnd} />
                            <Text style={formStyles.hint}>A changed end date must be after today and on or after the start date.</Text>
                        </> : <>
                            <Text style={formStyles.reviewValue}>{formatChallengeDate(endAt)}</Text>
                            <Text style={formStyles.hint}>Entries have closed, so this date is locked.</Text>
                        </>}

                        <Text style={formStyles.label}>Voting ends</Text>
                        {canChangeVotingEnd ? <>
                            <DateSelector label="Voting ends" value={votingEndAt} onChange={setVotingEndAt} minimumDate={minimumVotingEnd} />
                            <Text style={formStyles.hint}>Voting opens {formatChallengeDate(votingStart)}, the day after entries close.</Text>
                        </> : <>
                            <Text style={formStyles.reviewValue}>{formatChallengeDate(votingEndAt)}</Text>
                            <Text style={formStyles.hint}>Voting has closed, so this date is locked.</Text>
                        </>}

                        <Text style={formStyles.label}>Location</Text>
                        {!canChangeStartAndLocation && <Text style={formStyles.hint}>The challenge has begun. Its start date and location are locked.</Text>}
                        {canChangeStartAndLocation && <>
                            <Text style={formStyles.hint}>Update the coordinates to change the challenge location.</Text>
                            <Text style={formStyles.label}>Latitude</Text>
                            <TextInput accessibilityLabel="Latitude" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" style={formStyles.input} />
                            <Text style={formStyles.label}>Longitude</Text>
                            <TextInput accessibilityLabel="Longitude" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" style={formStyles.input} />
                        </>}
                        {validCoordinate && <ChallengeAreaMap coordinate={coordinate} radiusM={challenge.radius_m} style={formStyles.reviewMap} />}
                    </View>

                    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                    <Pressable accessibilityRole="button" onPress={save} disabled={busy || confirmDelete} style={[formStyles.button, styles.action, (busy || confirmDelete) && formStyles.buttonDisabled]}>
                        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={formStyles.buttonText}>Save changes</Text>}
                    </Pressable>
                    {confirmDelete ? <View style={styles.deleteConfirmation}>
                        <Text style={styles.error}>Delete “{challenge.title}”? Its submission records will also be deleted. This cannot be undone.</Text>
                        <Pressable accessibilityRole="button" onPress={remove} disabled={busy} style={[styles.deleteButton, busy && formStyles.buttonDisabled]}>
                            <Text style={styles.deleteText}>Delete challenge permanently</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(false)} disabled={busy} style={styles.back}>
                            <Text style={formStyles.reviewValue}>Cancel</Text>
                        </Pressable>
                    </View> : <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} disabled={busy} style={styles.deleteButton}>
                        <Text style={styles.deleteText}>Delete challenge</Text>
                    </Pressable>}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12},
    back: {minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center'},
    fields: {gap: 8},
    action: {flex: 0, minHeight: 48, marginTop: 16},
    error: {color: theme.colors.danger, fontSize: 14, lineHeight: 20},
    deleteButton: {minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, padding: 12, marginTop: 12},
    deleteText: {color: theme.colors.danger, fontSize: 16, fontWeight: '600'},
    deleteConfirmation: {gap: 8, paddingTop: 12},
});
