import {useState} from 'react';
import {Platform, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import MapView, {Circle, type LatLng, type Region} from 'react-native-maps';
import {Ionicons} from '@expo/vector-icons';
import {createChallengeStyles as styles} from '@/constants/styles';
import {theme} from '@/constants/theme';

export const formatRadius = (meters: number) => meters >= 1000 ? `${meters / 1000} km` : `${meters} m`;

// Fit the diameter to the map's shorter side with a small margin on each edge.
const regionForRadius = (center: LatLng, radiusM: number, aspectRatio: number): Region => {
    const diameterDegrees = (radiusM * 2 * 1.08) / 111195;
    const latitudeDelta = diameterDegrees / Math.min(aspectRatio, 1);
    const longitudeScale = Math.max(Math.cos(center.latitude * Math.PI / 180), 0.01);
    return {
        ...center,
        latitudeDelta: Math.min(latitudeDelta, 180),
        longitudeDelta: Math.min(latitudeDelta * aspectRatio / longitudeScale, 360),
    };
};

type Props = {
    coordinate: LatLng;
    radiusM: number;
    onCoordinateChange?: (coordinate: LatLng) => void;
    showCoordinates?: boolean;
    style?: StyleProp<ViewStyle>;
};

export default function ChallengeAreaMap({coordinate, radiusM, onCoordinateChange, showCoordinates = true, style}: Props) {
    const {colors} = theme;
    const editable = !!onCoordinateChange;
    const [aspectRatio, setAspectRatio] = useState(1);

    return (
        <View
            style={[styles.mapWrapper, style]}
            onLayout={({nativeEvent: {layout}}) => {
                if (layout.width > 0 && layout.height > 0) setAspectRatio(layout.width / layout.height);
            }}
        >
            <MapView
                style={{flex: 1}}
                initialRegion={editable ? {...coordinate, latitudeDelta: 0.01, longitudeDelta: 0.01} : undefined}
                region={editable ? undefined : regionForRadius(coordinate, radiusM, aspectRatio)}
                mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                scrollEnabled={editable}
                zoomEnabled={editable}
                rotateEnabled={editable}
                pitchEnabled={editable}
                onRegionChangeComplete={onCoordinateChange ? (region) => onCoordinateChange({latitude: region.latitude, longitude: region.longitude}) : undefined}
                accessibilityLabel={`Photo area centered at ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}, with a ${radiusM} meter radius`}
            >
                <Circle center={coordinate} radius={radiusM} strokeColor={colors.active} fillColor="rgba(255, 90, 54, 0.15)" />
            </MapView>
            <View style={styles.pinCentered} pointerEvents="none">
                <Ionicons name="location" size={40} color={colors.active} />
            </View>
            {showCoordinates && (
                <View style={styles.coordinateBadge} pointerEvents="none">
                    <Text style={styles.coordinateBadgeText}>
                        {coordinate.latitude.toFixed(6)}, {coordinate.longitude.toFixed(6)}
                    </Text>
                </View>
            )}
        </View>
    );
}
