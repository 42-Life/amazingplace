// SESSION STORAGE (iOS / Android)
// Phones don't have a built-in localStorage, so we add one backed by SQLite.
// Metro picks this file on iOS/Android because of the ".native" in its name.
import 'expo-sqlite/localStorage/install';
