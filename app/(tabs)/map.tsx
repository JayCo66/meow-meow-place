import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
    const router = useRouter();

    const [places, setPlaces] = useState([
        {
            id: '1',
            title: 'Meow Cafe & Bistro',
            description: 'คาเฟ่แมว มีน้องแมว 15 ตัว',
            type: 'cafe',
            coordinate: { latitude: 13.7563, longitude: 100.5018 },
        },
        {
            id: '2',
            title: 'Doggo Park',
            description: 'สวนสาธารณะสำหรับสุนัขวิ่งเล่น',
            type: 'park',
            coordinate: { latitude: 13.7663, longitude: 100.5118 },
        },
        {
            id: '3',
            title: 'Pet Friends Hospital',
            description: 'โรงพยาบาลรักษาสัตว์ 24 ชม.',
            type: 'hospital',
            coordinate: { latitude: 13.7463, longitude: 100.4918 },
        }
    ]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>แผนที่สถานที่ (Map)</Text>
            </View>

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: 13.7563,
                    longitude: 100.5018,
                    latitudeDelta: 0.05, // ยิ่งค่าน้อยยิ่งซูมเยอะ (ระยะซูม)
                    longitudeDelta: 0.05,
                }}
            >
                {places.map((place) => (
                    <Marker
                        key={place.id}
                        coordinate={place.coordinate}
                        title={place.title}
                        description={place.description}
                        pinColor={place.type === 'cafe' ? '#FF9800' : place.type === 'park' ? '#4CAF50' : '#F44336'}
                    >
                        {/* Custom Marker Callout (ป๊อปอัปเมื่อกดที่หมุด) */}
                        <Callout>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.calloutTitle}>{place.title}</Text>
                                <Text style={styles.calloutDescription}>{place.description}</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1', // สีพื้นหลัก
    },
    header: {
        padding: 16,
        backgroundColor: '#FFF8E1',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    calloutContainer: {
        width: 150,
        padding: 5,
    },
    calloutTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#3E2723',
        marginBottom: 2,
    },
    calloutDescription: {
        fontSize: 12,
        color: '#757575',
    },
    overlayContainer: {
        position: 'absolute',
        top: 100,
        left: 20,
        flexDirection: 'row',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF9800',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    }
});
