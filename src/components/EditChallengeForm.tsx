import {useState} from 'react';
import {ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import TextInput from '@/components/KeyboardTextInput';
import DateSelector from '@/components/explore/DateSelector';
import ChallengeAreaMap from '@/components/ChallengeAreaMap';
import {deleteChallenge, updateChallenge} from '@/lib/challenges';
import {getChallengeDate} from '@/utils/challenge-dates';
import type {ChallengeLocation} from '@/constants/types';
import {createChallengeStyles as formStyles} from '@/constants/styles';
import {theme} from '@/constants/theme';

export default function EditChallengeForm({challenge, onClose}: {challenge: ChallengeLocation; onClose: () => void}) {
    const [title, setTitle] = useState(challenge.title);
    const [description, setDescription] = useState(challenge.description ?? '');
    const [startAt, setStartAt] = useState(challenge.start_at);
    const [endAt, setEndAt] = useState(challenge.end_at);
    const [latitude, setLatitude] = useState(String(challenge.latitude));
    const [longitude, setLongitude] = useState(String(challenge.longitude));
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = getChallengeDate();
    const canChangeStartAndLocation = challenge.start_at > today;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minimumEnd = startAt > getChallengeDate(tomorrow) ? startAt : getChallengeDate(tomorrow);
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
                title, description, end_at: endAt,
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
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete this challenge.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <SafeAreaView style={formStyles.safe} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable accessibilityRole="button" accessibilityLabel="Back to challenge dashboard" onPress={onClose} disabled={busy} style={styles.back}>
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

                        <Text style={formStyles.label}>Start date</Text>
                        {canChangeStartAndLocation
                            ? <DateSelector label="Start date" value={startAt} onChange={setStartAt} minimumDate={today} />
                            : <Text style={formStyles.reviewValue}>{new Date(`${startAt}T12:00:00`).toLocaleDateString()}</Text>}
                        <Text style={formStyles.label}>End date</Text>
                        <DateSelector label="End date" value={endAt} onChange={setEndAt} minimumDate={minimumEnd} />
                        <Text style={formStyles.hint}>A changed end date must be after today and on or after the start date.</Text>

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
    error: {color: '#B91C1C', fontSize: 14, lineHeight: 20},
    deleteButton: {minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#B91C1C', padding: 12, marginTop: 12},
    deleteText: {color: '#B91C1C', fontSize: 16, fontWeight: '600'},
    deleteConfirmation: {gap: 8, paddingTop: 12},
});
