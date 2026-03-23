import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';

export default function HomeScreen() {
    const router = useRouter();
    const auth = getAuth();
    const user = auth.currentUser;

    // Mock Data สำหรับหมวดหมู่
    const categories = [
        { id: '1', title: 'Cafe', icon: 'coffee', color: '#FFB74D' },
        { id: '2', title: 'Park', icon: 'tree', color: '#81C784' },
        { id: '3', title: 'Hotel', icon: 'hotel', color: '#64B5F6' },
        { id: '4', title: 'Hospital', icon: 'plus-square', color: '#E57373' },
    ];

    // Mock Data สำหรับสถานที่ยอดนิยม
    const popularPlaces = [
        {
            id: 'p1',
            title: 'Meow Cafe & Bistro',
            rating: 4.8,
            reviews: 124,
            image: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?q=80&w=600&auto=format&fit=crop',
            type: 'Cafe',
            distance: '2.5 km'
        },
        {
            id: 'p2',
            title: 'Doggo Pet Park',
            rating: 4.5,
            reviews: 89,
            image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=600&auto=format&fit=crop',
            type: 'Park',
            distance: '5.1 km'
        }
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>สวัสดี, {user?.displayName || 'คนรักสัตว์'}</Text>
                        <Text style={styles.subGreeting}>วันนี้พาน้องๆ ไปเที่ยวไหนดี?</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => console.log('Go to profile')}
                    >
                        <MaterialIcons name="pets" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={24} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาสถานที่, คาเฟ่, สวนสาธารณะ..."
                        placeholderTextColor="#9E9E9E"
                    />
                    <TouchableOpacity style={styles.filterButton}>
                        <MaterialIcons name="tune" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Categories Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>หมวดหมู่</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesList}>
                        {categories.map((cat) => (
                            <TouchableOpacity key={cat.id} style={styles.categoryItem}>
                                <View style={[styles.categoryIcon, { backgroundColor: cat.color }]}>
                                    <FontAwesome5 name={cat.icon} size={20} color="#FFF" />
                                </View>
                                <Text style={styles.categoryText}>{cat.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Promotion / Banner */}
                <TouchableOpacity style={styles.bannerContainer}>
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>พาเพื่อนซี้สี่ขา</Text>
                        <Text style={styles.bannerSubtitle}>เปิดแมพหาสถานที่ใหม่ๆ เลย!</Text>
                        <TouchableOpacity
                            style={styles.bannerButton}
                            onPress={() => router.push('/map')}
                        >
                            <Text style={styles.bannerButtonText}>เปิดแผนที่</Text>
                        </TouchableOpacity>
                    </View>
                    <MaterialIcons name="map" size={80} color="rgba(255,255,255,0.3)" style={styles.bannerIcon} />
                </TouchableOpacity>

                {/* Popular Places Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>ยอดนิยมใกล้คุณ</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>ดูทั้งหมด</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {popularPlaces.map((place) => (
                            <TouchableOpacity key={place.id} style={styles.placeCard}>
                                <Image source={{ uri: place.image }} style={styles.placeImage} />
                                <View style={styles.placeInfo}>
                                    <Text style={styles.placeTitle} numberOfLines={1}>{place.title}</Text>
                                    <Text style={styles.placeType}>{place.type} • {place.distance}</Text>
                                    <View style={styles.ratingContainer}>
                                        <MaterialIcons name="star" size={16} color="#FFC107" />
                                        <Text style={styles.ratingText}>{place.rating} ({place.reviews})</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* ให้ขอบล่างมีที่ว่างตอนเลื่อนสุด */}
                <View style={{ height: 40 }} />
            </ScrollView>
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
        paddingTop: 20,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    subGreeting: {
        fontSize: 16,
        color: '#757575',
        marginTop: 4,
    },
    profileButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF9800',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 25,
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
    filterButton: {
        width: 50,
        height: 50,
        backgroundColor: '#FF9800',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionContainer: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3E2723',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    seeAllText: {
        color: '#FF9800',
        fontWeight: '600',
    },
    categoriesList: {
        paddingHorizontal: 16,
    },
    categoryItem: {
        alignItems: 'center',
        marginHorizontal: 12,
    },
    categoryIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryText: {
        fontSize: 14,
        color: '#5D4037',
        fontWeight: '500',
    },
    bannerContainer: {
        marginHorizontal: 20,
        marginBottom: 30,
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
    },
    bannerTextContainer: {
        flex: 1,
        zIndex: 1,
    },
    bannerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    bannerSubtitle: {
        color: '#E8F5E9',
        fontSize: 14,
        marginBottom: 16,
    },
    bannerButton: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    bannerButtonText: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 14,
    },
    bannerIcon: {
        position: 'absolute',
        right: -10,
        bottom: -15,
    },
    placeCard: {
        width: 240,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginLeft: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    placeImage: {
        width: '100%',
        height: 140,
    },
    placeInfo: {
        padding: 16,
    },
    placeTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3E2723',
        marginBottom: 6,
    },
    placeType: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#5D4037',
    },
    floatingLogout: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F44336',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F44336',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    }
});
