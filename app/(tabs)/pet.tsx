import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';

// รูปแบบข้อมูลโพสต์
interface Post {
    id: string;
    userName: string;
    userAvatar?: string;
    imageUrl: string;
    caption: string;
    likes: number;
}

// Mock Data สำหรับ Feed (ควรจะดึงจาก Firestore จริงในอนาคต)
const initialPosts: Post[] = [
    {
        id: '1',
        userName: 'Mali the Cat',
        imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=600&auto=format&fit=crop',
        caption: 'วันนี้มาคาเฟ่ใหม่คับ 😻 แอร์เย็นฉ่ำ',
        likes: 24,
    },
    {
        id: '2',
        userName: 'Corgi Lover',
        imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600&auto=format&fit=crop',
        caption: 'วิ่งสุดพลังที่ Doggo Park 🐶💨',
        likes: 45,
    }
];

export default function PetScreen() {
    const auth = getAuth();
    const userName = auth.currentUser?.displayName || 'Unknown';

    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [isPosting, setIsPosting] = useState(false);
    const [newCaption, setNewCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // ฟังก์ชันเลือกรูปจากเครื่อง
    const pickImage = async () => {
        // ขออนุญาตเข้าถึงคลังภาพ
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("ขออภัย ต้องใช้สิทธิ์เข้าถึงคลังรูปภาพเพื่อโพสต์ครับ!");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // ฟังก์ชันลงโพสต์
    const handlePost = () => {
        if (!selectedImage && !newCaption) return;

        const newPost: Post = {
            id: Date.now().toString(),
            userName: userName,
            imageUrl: selectedImage || 'https://via.placeholder.com/600x400?text=No+Image', // รูป Default สำหรับเคสไม่มีรูป
            caption: newCaption,
            likes: 0,
        };

        setPosts([newPost, ...posts]);
        setNewCaption('');
        setSelectedImage(null);
        setIsPosting(false);
    };

    // คอมโพเนนต์การ์ดสำหรับ 1 โพสต์
    const renderItem = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            {/* ส่วนหัวโพสต์ (ชื่อเจ้าของ) */}
            <View style={styles.postHeader}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
                </View>
                <Text style={styles.postUserName}>{item.userName}</Text>
            </View>

            {/* รูปภาพ */}
            {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
            )}

            {/* ส่วนปุ่มกด Like / แคปชัน */}
            <View style={styles.postFooter}>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons name="favorite-border" size={28} color="#F44336" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons name="chat-bubble-outline" size={26} color="#424242" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.likesText}>{item.likes} เลิฟ</Text>
                <Text style={styles.captionText}>
                    <Text style={styles.captionUsername}>{item.userName} </Text>
                    {item.caption}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header ของหน้าแอป */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>สังคมคนรักสัตว์</Text>
                <TouchableOpacity onPress={() => setIsPosting(!isPosting)}>
                    <MaterialIcons name={isPosting ? "close" : "add-box"} size={32} color="#3E2723" />
                </TouchableOpacity>
            </View>

            {/* ส่วน UI สำหรับสร้างโพสต์ใหม่ (จะโชว์เมื่อกดปุ่ม + ด้านบน) */}
            {isPosting && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.createPostContainer}
                >
                    <View style={styles.inputRow}>
                        <View style={styles.avatarPlaceholderSmall}>
                            <Text style={styles.avatarTextSmall}>{userName.charAt(0)}</Text>
                        </View>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="อวดน้องๆ หน่อยสิ..."
                            value={newCaption}
                            onChangeText={setNewCaption}
                            multiline
                        />
                    </View>

                    {selectedImage && (
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    )}

                    <View style={styles.createPostActions}>
                        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                            <MaterialIcons name="photo-library" size={24} color="#FF9800" />
                            <Text style={styles.photoButtonText}>เลือกรูปภาพ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.postButton, (!newCaption && !selectedImage) && styles.postButtonDisabled]}
                            onPress={handlePost}
                            disabled={!newCaption && !selectedImage}
                        >
                            <Text style={styles.postButtonText}>โพสต์เลย</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* สรุปหน้าฟีดหลัก */}
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.feedContainer}
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
        paddingVertical: 15,
        backgroundColor: '#FFF8E1',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#3E2723',
    },
    feedContainer: {
        paddingBottom: 20,
    },
    postCard: {
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#EFEFEF',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF9800',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    postUserName: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#3E2723',
    },
    postImage: {
        width: '100%',
        height: 350, // ปรับความสูงภาพให้ลงตัวแบบ IG
        backgroundColor: '#F5F5F5',
    },
    postFooter: {
        padding: 12,
    },
    actionRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    actionButton: {
        marginRight: 16,
    },
    likesText: {
        fontWeight: 'bold',
        color: '#3E2723',
        marginBottom: 6,
    },
    captionText: {
        color: '#424242',
        lineHeight: 20,
    },
    captionUsername: {
        fontWeight: 'bold',
        color: '#3E2723',
    },
    /* ส่วนประกอบสร้างโพสต์ */
    createPostContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    avatarPlaceholderSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FF9800',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTextSmall: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    captionInput: {
        flex: 1,
        minHeight: 40,
        fontSize: 16,
        color: '#333',
        paddingTop: 8, // for multiline
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
    },
    createPostActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    photoButtonText: {
        marginLeft: 6,
        color: '#FF9800',
        fontWeight: 'bold',
    },
    postButton: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    postButtonDisabled: {
        backgroundColor: '#E0E0E0',
    },
    postButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    }
});
