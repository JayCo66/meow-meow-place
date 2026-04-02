import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Linking, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

interface Place {
    id: string;
    title: string;
    description: string;
    type: string;
    googlemapUrl?: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
}

export default function MapScreen() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);

    const [places, setPlaces] = useState<Place[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newPlace, setNewPlace] = useState({
        title: '',
        description: '',
        type: 'cafe',
        googlemap_url: '',
        latitude: '',
        longitude: ''
    });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPlaces = places.filter(place => 
        place.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSearchSubmit = () => {
        if (searchQuery !== '' && filteredPlaces.length > 0) {
            const firstPlace = filteredPlaces[0];
            mapRef.current?.animateToRegion({
                latitude: firstPlace.coordinate.latitude,
                longitude: firstPlace.coordinate.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
    };

    useEffect(() => {
        const q = query(collection(db, 'places'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const placesData: Place[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                placesData.push({
                    id: doc.id,
                    title: data.title || 'Untitled',
                    description: data.description || '',
                    type: data.type || 'other',
                    googlemapUrl: data.googlemap_url || '',
                    coordinate: {
                        latitude: data.latitude || 0,
                        longitude: data.longitude || 0,
                    }
                });
            });
            setPlaces(placesData);
        });

        return () => unsubscribe();
    }, []);

    const openInGoogleMaps = (url?: string) => {
        if (url && url.startsWith('http')) {
            Linking.openURL(url).catch((err) => {
                console.error("Couldn't load page", err);
                Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิด Google Maps ได้");
            });
        } else {
            Alert.alert("ขออภัย", "สถานที่นี้ยังไม่ได้ระบุลิงก์นำทางครับ");
        }
    };

    const handleAddPlace = async () => {
        if (!newPlace.title || !newPlace.latitude || !newPlace.longitude) {
            Alert.alert("เตือน!", "กรุณากรอกชื่อและพิกัดให้ครบถ้วนครับ");
            return;
        }

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'places'), {
                title: newPlace.title,
                description: newPlace.description,
                type: newPlace.type,
                googlemap_url: newPlace.googlemap_url,
                latitude: parseFloat(newPlace.latitude),
                longitude: parseFloat(newPlace.longitude),
            });

            setNewPlace({ title: '', description: '', type: 'cafe', googlemap_url: '', latitude: '', longitude: '' });
            setIsAdding(false);
            Alert.alert("สำเร็จ!", "เพิ่มสถานที่เรียบร้อยแล้วครับ 🐶🐱");
        } catch (error) {
            console.error("Error adding place: ", error);
            Alert.alert("ผิดพลาด!", "ไม่สามารถบันทึกข้อมูลได้");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>แผนที่สถานที่ (Map)</Text>
                
                <View style={styles.searchBarContainer}>
                    <MaterialIcons name="search" size={20} color="#757575" style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาชื่อสถานที่..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        onSubmitEditing={handleSearchSubmit}
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="close" size={20} color="#757575" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: 13.7563,
                    longitude: 100.5018,
                    latitudeDelta: 0.05, // ยิ่งค่าน้อยยิ่งซูมเยอะ (ระยะซูม)
                    longitudeDelta: 0.05,
                }}
            >
                {filteredPlaces.map((place: Place) => (
                    <Marker
                        key={place.id}
                        coordinate={place.coordinate}
                        title={place.title}
                        description={place.description}
                        pinColor={place.type === 'cafe' ? '#FF9800' : place.type === 'park' ? '#4CAF50' : '#F44336'}
                    >
                        {/* Custom Marker Callout (ป๊อปอัปเมื่อกดที่หมุด) */}
                        <Callout onPress={() => openInGoogleMaps(place.googlemapUrl)}>
                            <View style={styles.calloutContainer}>
                                 <Text style={styles.calloutTitle}>{place.title}</Text>
                                 <Text style={styles.calloutDescription}>{place.description}</Text>
                                 
                                 {place.googlemapUrl ? (
                                     <View style={styles.navigationButton}>
                                         <MaterialIcons name="map" size={14} color="#FFF" />
                                         <Text style={styles.navigationButtonText}>เปิด Google Maps</Text>
                                     </View>
                                 ) : null}
                             </View>
                         </Callout>
                    </Marker>
                ))}
            </MapView>

            {/* ปุ่มเพิ่มสถานที่ (Floating Action Button) */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setIsAdding(true)}
            >
                <MaterialIcons name="add-location" size={32} color="#FFF" />
            </TouchableOpacity>

            {/* Modal ฟอร์มเพิ่มสถานที่ */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isAdding}
                onRequestClose={() => setIsAdding(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เพิ่มสถานที่ใหม่</Text>
                            <TouchableOpacity onPress={() => setIsAdding(false)}>
                                <MaterialIcons name="close" size={28} color="#757575" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <Text style={styles.label}>ชื่อสถานที่ *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="เช่น คาเฟ่แมวเหมียว"
                                value={newPlace.title}
                                onChangeText={(text) => setNewPlace({ ...newPlace, title: text })}
                            />

                            <Text style={styles.label}>คำอธิบาย</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="เช่น มีแมวเยอะมาก บรรยากาศดี"
                                value={newPlace.description}
                                onChangeText={(text) => setNewPlace({ ...newPlace, description: text })}
                                multiline
                                numberOfLines={3}
                            />

                            <Text style={styles.label}>ประเภท (cafe, park, hospital)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="เช่น cafe"
                                value={newPlace.type}
                                onChangeText={(text) => setNewPlace({ ...newPlace, type: text.toLowerCase() })}
                            />

                            <Text style={styles.label}>ลิงก์ Google Maps (ถ้ามี)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://maps.app.goo.gl/..."
                                value={newPlace.googlemap_url}
                                onChangeText={(text) => setNewPlace({ ...newPlace, googlemap_url: text })}
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.label}>ละติจูด (Lat) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="13.7563"
                                        keyboardType="numeric"
                                        value={newPlace.latitude}
                                        onChangeText={(text) => setNewPlace({ ...newPlace, latitude: text })}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>ลองจิจูด (Long) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="100.5018"
                                        keyboardType="numeric"
                                        value={newPlace.longitude}
                                        onChangeText={(text) => setNewPlace({ ...newPlace, longitude: text })}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                                onPress={handleAddPlace}
                                disabled={isSaving}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSaving ? "กำลังบันทึก..." : "บันทึกสถานที่"}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
        marginBottom: 10,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        padding: 0,
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
    calloutNavigationHint: {
        fontSize: 10,
        color: '#FF9800',
        fontWeight: 'bold',
        marginTop: 6,
    },
    navigationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF9800',
        borderRadius: 15,
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginTop: 10,
    },
    navigationButtonText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
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
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF9800',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    saveButton: {
        backgroundColor: '#FF9800',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 25,
        marginBottom: 30,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
