import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../firebaseConfig';
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, updateDoc, arrayUnion, arrayRemove, doc, increment, deleteDoc
} from 'firebase/firestore';
import { supabase } from '../../supabaseClient';

// รูปแบบข้อมูลโพสต์
interface Post {
    id: string;
    userName: string;
    userAvatar?: string;
    imageUrl: string;
    caption: string;
    likes: number;
    likedBy: string[];
    userId: string;
}

export default function PetScreen() {
    const userName = auth.currentUser?.displayName || 'Unknown';


    const [posts, setPosts] = useState<Post[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [newCaption, setNewCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [editCaption, setEditCaption] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData: Post[] = [];
            querySnapshot.forEach((doc) => {
                postsData.push({ id: doc.id, ...doc.data() } as Post);
            });
            setPosts(postsData);
            setIsInitialLoading(false); // โหลดเสร็จแล้ว
        });
        return () => unsubscribe();
    }, []);

    if (isInitialLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={{ marginTop: 10, color: '#8D6E63' }}>กำลังเรียกเด็กๆ มาวมตัวกัน...</Text>
            </View>
        );
    }

    const renderEmptyFeed = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="pets" size={80} color="#D7CCC8" />
            <Text style={styles.emptyTitle}>ยังไม่มีโพสต์เลย</Text>
            <Text style={styles.emptySubtitle}>อวดน้องๆ เป็นคนแรกของคอมมูนิตี้กันเถอะ! 🐶🐱</Text>

            <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setIsPosting(true)}
            >
                <Text style={styles.emptyButtonText}>เริ่มโพสต์เลย</Text>
            </TouchableOpacity>
        </View>
    );

    const handleToggleLike = async (post: Post) => {
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) return;

        const postRef = doc(db, 'posts', post.id);
        const isLiked = post.likedBy?.includes(currentUserId);

        try {
            if (isLiked) {
                // ถ้าเคยไลก์แล้ว -> เอาไลก์ออก
                await updateDoc(postRef, {
                    likedBy: arrayRemove(currentUserId),
                    likes: increment(-1)
                });
            } else {
                // ถ้ายังไม่เคยไลก์ -> เพิ่มไลก์
                await updateDoc(postRef, {
                    likedBy: arrayUnion(currentUserId),
                    likes: increment(1)
                });
            }
        } catch (error) {
            console.error("Error toggling like: ", error);
        }
    };

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
    const handlePost = async () => {
        // บังคับว่าต้องมีทั้งรูปและข้อความถึงจะไปต่อ
        if (!selectedImage || !newCaption) {
            alert("กรุณาเลือกรูปภาพและใส่แคปชันให้ครบถ้วนครับ!");
            return;
        }

        setIsUploading(true); // 1. เริ่มแสดง Loading ที่ปุ่ม

        try {
            // --- ส่วนที่ 1: เตรียมไฟล์สำหรับ Supabase (ใช้ FormData จะเสถียรสุดใน Mobile) ---
            const formData = new FormData();
            const fileName = `${auth.currentUser?.uid}-${Date.now()}.jpg`;

            formData.append('file', {
                uri: selectedImage,
                name: fileName,
                type: 'image/jpeg',
            });

            // --- ส่วนที่ 2: อัปโหลดไป Supabase Storage ---
            const { data, error } = await supabase.storage
                .from('pet-app')
                .upload(fileName, formData);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('pet-app')
                .getPublicUrl(fileName);
            await addDoc(collection(db, 'posts'), {
                userName: userName,
                imageUrl: publicUrl,
                caption: newCaption,
                likes: 0,
                likedBy: [],
                createdAt: serverTimestamp(),
                userId: auth.currentUser?.uid
            });

            // ล้างค่าและปิดหน้าต่าง
            setNewCaption('');
            setSelectedImage(null);
            setIsPosting(false);
            alert("โพสต์น้องๆ สำเร็จแล้ว! 🐶🐱");

        } catch (error) {
            console.error("Error:", error);
            alert("โพสต์ไม่สำเร็จ: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeletePost = async (post: Post) => {
        Alert.alert(
            "ยืนยันการลบ",
            "คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้?",
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ลบ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // 1. ลบข้อมูลใน Firestore
                            await deleteDoc(doc(db, 'posts', post.id));

                            // 2. ลบรูปใน Supabase (แกะชื่อไฟล์จาก URL)
                            const filePath = post.imageUrl.split('/').pop(); // ดึงชื่อไฟล์ท้าย URL
                            if (filePath) {
                                await supabase.storage
                                    .from('pet-app')
                                    .remove([filePath]);
                            }

                            alert("ลบโพสต์เรียบร้อยแล้ว");
                        } catch (error) {
                            console.error("Error deleting post:", error);
                        }
                    }
                }
            ]
        );
    };

    const handleUpdate = async (postId: string, updatedCaption: string) => {
        try {
            const postRef = doc(db, 'posts', postId);
            await updateDoc(postRef, {
                caption: updatedCaption,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating post: ", error);
            alert("ไม่สามารถแก้ไขโพสต์ได้");
        }
    };

    const handleEditPost = (post: Post) => {
        setEditingPost(post);
        setEditCaption(post.caption);
    };

    const saveEdit = async () => {
        if (editingPost && editCaption) {
            await handleUpdate(editingPost.id, editCaption);
            setEditingPost(null);
            alert("แก้ไขเรียบร้อย!");
        }
    };

    // คอมโพเนนต์การ์ดสำหรับ 1 โพสต์
    const renderItem = ({ item }: { item: Post }) => {
        const currentUserId = auth.currentUser?.uid;
        const isLiked = item.likedBy?.includes(currentUserId || '');
        const isOwner = item.userId === currentUserId;

        const showOptions = () => {
            Alert.alert(
                "จัดการโพสต์",
                "เลือกรายการที่คุณต้องการ",
                [
                    { text: "แก้ไขแคปชัน", onPress: () => handleEditPost(item) },
                    { text: "ลบโพสต์", style: "destructive", onPress: () => handleDeletePost(item) },
                    { text: "ยกเลิก", style: "cancel" }
                ]
            );
        };

        return (
            <View style={styles.postCard}>
                <View style={styles.postHeader}>
                    <View style={styles.userInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
                        </View>
                        <Text style={styles.postUserName}>{item.userName}</Text>
                    </View>

                    {/* เปลี่ยนจากปุ่มลบ เป็นปุ่มเมนูทางเลือก */}
                    {isOwner && (
                        <TouchableOpacity
                            onPress={showOptions}
                            style={styles.deleteButton}
                        >
                            <MaterialIcons name="more-horiz" size={26} color="#757575" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* ส่วนรูปภาพ */}
                {item.imageUrl ? (
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.postImage, { justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialIcons name="broken-image" size={50} color="#CCC" />
                    </View>
                )}

                <View style={styles.postFooter}>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleToggleLike(item)}
                        >
                            <MaterialIcons
                                name={isLiked ? "favorite" : "favorite-border"}
                                size={28}
                                color={isLiked ? "#F44336" : "#424242"}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <MaterialIcons name="chat-bubble-outline" size={26} color="#424242" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.likesText}>{item.likes || 0} เลิฟ</Text>

                    <Text style={styles.captionText}>
                        <Text style={styles.captionUsername}>{item.userName} </Text>
                        {item.caption}
                    </Text>
                </View>
            </View>
        );
    };


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
                            autoCorrect={false} // ปิดการเดาคำ
                            spellCheck={false}  // ปิดการตรวจตัวสะกด
                            autoCapitalize="none" // ไม่ต้องปรับตัวใหญ่ตัวเล็กอัตโนมัติ
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
                contentContainerStyle={[
                    styles.feedContainer,
                    posts.length === 0 && { flex: 1, justifyContent: 'center' } // จัดกึ่งกลางถ้าไม่มีข้อมูล
                ]}
                ListEmptyComponent={renderEmptyFeed} // ดึง Component มาโชว์ที่นี่
            />

            {/* Modal สำหรับแก้ไขข้อความ */}
            {editingPost && (
                <View style={styles.editOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.editTitle}>แก้ไขแคปชัน</Text>
                        <TextInput
                            style={styles.editInput}
                            value={editCaption}
                            onChangeText={setEditCaption}
                            multiline
                        />
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setEditingPost(null)}>
                                <Text style={styles.cancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveEdit} style={styles.saveButton}>
                                <Text style={styles.saveButtonText}>บันทึก</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
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
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 100, // ปรับระยะห่างตามความเหมาะสม
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5D4037',
        marginTop: 15,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#8D6E63',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    emptyButton: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 25,
        elevation: 2,
    },
    emptyButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    deleteButton: {
        padding: 4,
    },
    editOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    editModal: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 20,
        elevation: 5,
    },
    editTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 10,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 15,
    },
    cancelText: {
        color: '#757575',
        marginRight: 20,
    },
    saveButton: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
