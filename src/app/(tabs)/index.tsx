// INDEX ROUTE
// The app opens on the map. The camera now lives inside each challenge page (src/app/challenge/[id].tsx).
import {Redirect} from 'expo-router';

export default function Index() {
    return <Redirect href="/explore" />;
}
