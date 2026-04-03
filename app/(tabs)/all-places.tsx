import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '../../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';

interface Place {
    id: string;
    title: string;
    description: string;
    type: string;
    image?: string;
}

const getDefaultImage = (type: string) => {
    const defaultType = type?.toLowerCase() || '';
    if (defaultType.includes('cafe')) return 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=600&auto=format&fit=crop';
    if (defaultType.includes('park')) return 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=600&auto=format&fit=crop';
    if (defaultType.includes('hospital') || defaultType.includes('clinic')) return 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=600&auto=format&fit=crop';
    if (defaultType.includes('hotel') || defaultType.includes('resort')) return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600&auto=format&fit=crop';
    if (defaultType.includes('restaurant') || defaultType.includes('food')) return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600&auto=format&fit=crop';

    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop';
};

export default function AllPlacesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [places, setPlaces] = useState<Place[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState((params.filter as string) || 'All');

    // Update active filter if route params change
    useEffect(() => {
        if (params.filter) {
            setActiveFilter(params.filter as string);
        }
    }, [params.filter]);

    const categories = [
        { id: 'All', title: 'ทั้งหมด', icon: 'border-all' },
        { id: 'cafe', title: 'Cafe', icon: 'coffee' },
        { id: 'restaurant', title: 'Restaurant', icon: 'utensils' },
        { id: 'park', title: 'Park', icon: 'tree' },
        { id: 'hotel', title: 'Hotel', icon: 'hotel' },
        { id: 'hospital', title: 'Hospital', icon: 'plus-square' },
    ];

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
                    type: data.type || 'Other',
                    image: data.image || getDefaultImage(data.type || ''),
                });
            });
            setPlaces(placesData);
        });

        return () => unsubscribe();
    }, []);

    const filteredPlaces = places.filter(place => {
        const matchesSearch = place.title.toLowerCase().includes(searchQuery.toLowerCase()) || place.type.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All' || place.type.toLowerCase().includes(activeFilter.toLowerCase());
        return matchesSearch && matchesFilter;
    });

    const renderPlaceItem = ({ item }: { item: Place }) => (
        <TouchableOpacity style={styles.placeCard}>
            <Image source={{ uri: item.image }} style={styles.placeImage} />
            <View style={styles.placeInfo}>
                <View style={styles.placeHeaderRow}>
                    <Text style={styles.placeTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={styles.placeDescription} numberOfLines={2}>{item.description}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#3E2723" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>สถานที่ทั้งหมด</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={24} color="#9E9E9E" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="ค้นหาสถานที่..."
                    placeholderTextColor="#9E9E9E"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={categories}
                    keyExtractor={(cat) => cat.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.filterChip, activeFilter === item.id && styles.activeFilterChip]}
                            onPress={() => setActiveFilter(item.id)}
                        >
                            <FontAwesome5 
                                name={item.icon} 
                                size={14} 
                                color={activeFilter === item.id ? '#FFF' : '#757575'} 
                                style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.filterText, activeFilter === item.id && styles.activeFilterText]}>
                                {item.title}
                            </Text>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                />
            </View>

            <FlatList
                data={filteredPlaces}
                keyExtractor={(item) => item.id}
                renderItem={renderPlaceItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="search-off" size={60} color="#D7CCC8" />
                        <Text style={styles.emptyText}>ไม่พบสถานที่ที่คุณค้นหา</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFF8E1',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
    },
    searchIcon: {
        position: 'absolute',
        left: 36,
        zIndex: 1,
    },
    searchInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingLeft: 44,
        paddingRight: 16,
        fontSize: 16,
        color: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterContainer: {
        marginBottom: 15,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    activeFilterChip: {
        backgroundColor: '#FF9800',
        borderColor: '#FF9800',
    },
    filterText: {
        color: '#757575',
        fontWeight: '600',
    },
    activeFilterText: {
        color: '#FFFFFF',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    placeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    placeImage: {
        width: '100%',
        height: 180,
    },
    placeInfo: {
        padding: 16,
    },
    placeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    placeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3E2723',
        flex: 1,
        marginRight: 10,
    },
    typeBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 12,
        color: '#FF9800',
        fontWeight: 'bold',
    },
    placeDescription: {
        fontSize: 14,
        color: '#757575',
        lineHeight: 20,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9E9E9E',
    }
});
