import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../../firebaseConfig';
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
    commentCount?: number;
}

interface Comment {
    id: string;
    userName: string;
    text: string;
    createdAt: any;
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

    // --- Comment States ---
    const [viewingCommentsPost, setViewingCommentsPost] = useState<Post | null>(null);
    const [postComments, setPostComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

    // Effect สำหรับโหลดคอมเมนต์เมื่อเปิดโพสต์นั้นๆ ขึ้นมา
    useEffect(() => {
        if (!viewingCommentsPost) {
            setPostComments([]);
            return;
        }

        const commentsRef = collection(db, 'posts', viewingCommentsPost.id, 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const commentsData: Comment[] = [];
            querySnapshot.forEach((doc) => {
                commentsData.push({ id: doc.id, ...doc.data() } as Comment);
            });
            setPostComments(commentsData);
        });

        return () => unsubscribe();
    }, [viewingCommentsPost]);

    if (isInitialLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={styles.loadingText}>กำลังเรียกเด็กๆ มารวมตัวกัน...</Text>
            </View>
        );
    }

    const renderEmptyFeed = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name="pets" size={80} color="#D7CCC8" />
            <Text style={styles.emptyTitle}>ยังไม่มีโพสต์เลย</Text>
            <Text style={styles.emptySubtitle}>อวดน้องๆ เป็นคนแรกของคอมมูนิตี้กันเถอะ! 🐶🐱</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setIsPosting(true)}>
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
            await updateDoc(postRef, {
                likedBy: isLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId),
                likes: increment(isLiked ? -1 : 1)
            });
        } catch (error) {
            console.error("Error toggling like: ", error);
        }
    };

    // ฟังก์ชันเลือกรูปจากเครื่อง
    const pickImage = async () => {
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
        if (!selectedImage || !newCaption) {
            alert("กรุณาเลือกรูปภาพและใส่แคปชันให้ครบถ้วนครับ!");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            const fileName = `${auth.currentUser?.uid}-${Date.now()}.jpg`;
            formData.append('file', {
                uri: selectedImage,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { error } = await supabase.storage.from('pet-app').upload(fileName, formData);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('pet-app').getPublicUrl(fileName);
            await addDoc(collection(db, 'posts'), {
                userName,
                imageUrl: publicUrl,
                caption: newCaption,
                likes: 0,
                likedBy: [],
                createdAt: serverTimestamp(),
                userId: auth.currentUser?.uid
            });

            setNewCaption('');
            setSelectedImage(null);
            setIsPosting(false);
            alert("โพสต์น้องๆ สำเร็จแล้ว! 🐶🐱");
        } catch (error: any) {
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
                            await deleteDoc(doc(db, 'posts', post.id));
                            const filePath = post.imageUrl.split('/').pop();
                            if (filePath) {
                                await supabase.storage.from('pet-app').remove([filePath]);
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

    const saveEdit = async () => {
        if (editingPost && editCaption) {
            try {
                await updateDoc(doc(db, 'posts', editingPost.id), {
                    caption: editCaption,
                    updatedAt: serverTimestamp()
                });
                setEditingPost(null);
                alert("แก้ไขเรียบร้อย!");
            } catch (error) {
                console.error("Error updating post:", error);
                alert("ไม่สามารถแก้ไขโพสต์ได้");
            }
        }
    };

    const handleAddComment = async () => {
        if (!viewingCommentsPost || !newComment.trim()) return;
        setIsSubmittingComment(true);
        try {
            await addDoc(collection(db, 'posts', viewingCommentsPost.id, 'comments'), {
                userName,
                userId: auth.currentUser?.uid,
                text: newComment,
                createdAt: serverTimestamp()
            });
            await updateDoc(doc(db, 'posts', viewingCommentsPost.id), {
                commentCount: increment(1)
            });
            setNewComment('');
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("ไม่สามารถแสดงความคิดเห็นได้");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const renderItem = ({ item }: { item: Post }) => {
        const currentUserId = auth.currentUser?.uid;
        const isLiked = item.likedBy?.includes(currentUserId || '');
        const isOwner = item.userId === currentUserId;

        const showOptions = () => {
            Alert.alert("จัดการโพสต์", "เลือกรายการที่คุณต้องการ", [
                { text: "แก้ไขแคปชัน", onPress: () => { setEditingPost(item); setEditCaption(item.caption); } },
                { text: "ลบโพสต์", style: "destructive", onPress: () => handleDeletePost(item) },
                { text: "ยกเลิก", style: "cancel" }
            ]);
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
                    {isOwner && (
                        <TouchableOpacity onPress={showOptions} style={styles.deleteButton}>
                            <MaterialIcons name="more-horiz" size={26} color="#757575" />
                        </TouchableOpacity>
                    )}
                </View>

                {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.postImage, { justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialIcons name="broken-image" size={50} color="#CCC" />
                    </View>
                )}

                <View style={styles.postFooter}>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleLike(item)}>
                            <MaterialIcons name={isLiked ? "favorite" : "favorite-border"} size={28} color={isLiked ? "#F44336" : "#424242"} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setViewingCommentsPost(item)}>
                            <MaterialIcons name="chat-bubble-outline" size={26} color="#424242" />
                            {item.commentCount ? <Text style={styles.commentBadge}>{item.commentCount}</Text> : null}
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
            <View style={styles.header}>
                <View style={{ width: 32 }} />
                <Text style={styles.headerTitle}>สังคมคนรักสัตว์</Text>
                <TouchableOpacity onPress={() => setIsPosting(!isPosting)}>
                    <MaterialIcons name={isPosting ? "close" : "add-box"} size={32} color="#3E2723" />
                </TouchableOpacity>
            </View>

            {isPosting && (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.createPostContainer}>
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
                    {selectedImage && <Image source={{ uri: selectedImage }} style={styles.previewImage} />}
                    <View style={styles.createPostActions}>
                        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                            <MaterialIcons name="photo-library" size={24} color="#FF9800" />
                            <Text style={styles.photoButtonText}>เลือกรูปภาพ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.postButton, (!newCaption && !selectedImage) && styles.postButtonDisabled]}
                            onPress={handlePost}
                            disabled={!newCaption && !selectedImage || isUploading}
                        >
                            {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.postButtonText}>โพสต์เลย</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            <FlatList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.feedContainer,
                    posts.length === 0 && { flex: 1, justifyContent: 'center' }
                ]}
                ListEmptyComponent={renderEmptyFeed}
            />

            {editingPost && (
                <View style={styles.editOverlay}>
                    <View style={styles.editModal}>
                        <Text style={styles.editTitle}>แก้ไขแคปชัน</Text>
                        <TextInput style={styles.editInput} value={editCaption} onChangeText={setEditCaption} multiline />
                        <View style={styles.editActions}>
                            <TouchableOpacity onPress={() => setEditingPost(null)}><Text style={styles.cancelText}>ยกเลิก</Text></TouchableOpacity>
                            <TouchableOpacity onPress={saveEdit} style={styles.saveButton}><Text style={styles.saveButtonText}>บันทึก</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {viewingCommentsPost && (
                <View style={styles.editOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentModal}>
                        <View style={styles.commentHeader}>
                            <Text style={styles.editTitle}>ความคิดเห็น</Text>
                            <TouchableOpacity onPress={() => setViewingCommentsPost(null)}><MaterialIcons name="close" size={24} color="#757575" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={postComments}
                            keyExtractor={(item) => item.id}
                            style={styles.commentList}
                            renderItem={({ item }) => (
                                <View style={styles.commentItem}>
                                    <View style={styles.avatarPlaceholderMini}><Text style={styles.avatarTextMini}>{item.userName.charAt(0)}</Text></View>
                                    <View style={styles.commentContent}>
                                        <Text style={styles.commentUser}>{item.userName}</Text>
                                        <Text style={styles.commentText}>{item.text}</Text>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyComments}><Text style={styles.emptyCommentsText}>ยังไม่มีความคิดเห็น มาเริ่มคุยกันเถอะ!</Text></View>
                            )}
                        />
                        <View style={styles.commentInputRow}>
                            <TextInput style={styles.commentInput} placeholder="เขียนความคิดเห็น..." value={newComment} onChangeText={setNewComment} multiline />
                            <TouchableOpacity style={styles.sendButton} onPress={handleAddComment} disabled={!newComment.trim() || isSubmittingComment}>
                                {isSubmittingComment ? <ActivityIndicator size="small" color="#FF9800" /> : <MaterialIcons name="send" size={24} color="#FF9800" />}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8E1' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#8D6E63' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF8E1', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
    feedContainer: { paddingBottom: 20 },
    postCard: { backgroundColor: '#FFFFFF', marginBottom: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#EFEFEF' },
    postHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    postUserName: { fontWeight: 'bold', fontSize: 16, color: '#3E2723' },
    postImage: { width: '100%', height: 350, backgroundColor: '#F5F5F5' },
    postFooter: { padding: 12 },
    actionRow: { flexDirection: 'row', marginBottom: 8 },
    likesText: { fontWeight: 'bold', color: '#3E2723', marginBottom: 6 },
    captionText: { color: '#424242', lineHeight: 20 },
    captionUsername: { fontWeight: 'bold', color: '#3E2723' },
    createPostContainer: { backgroundColor: '#FFFFFF', padding: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
    inputRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    avatarPlaceholderSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarTextSmall: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    captionInput: { flex: 1, minHeight: 40, fontSize: 16, color: '#333', paddingTop: 8 },
    previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
    createPostActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    photoButtonText: { marginLeft: 6, color: '#FF9800', fontWeight: 'bold' },
    postButton: { backgroundColor: '#FF9800', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, minWidth: 80, alignItems: 'center' },
    postButtonDisabled: { backgroundColor: '#E0E0E0' },
    postButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#5D4037', marginTop: 15 },
    emptySubtitle: { fontSize: 14, color: '#8D6E63', textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyButton: { backgroundColor: '#FF9800', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25, marginTop: 25, elevation: 2 },
    emptyButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    deleteButton: { padding: 4 },
    editOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    editModal: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, elevation: 5 },
    editTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    editInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
    editActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15 },
    cancelText: { color: '#757575', marginRight: 20 },
    saveButton: { backgroundColor: '#FF9800', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    saveButtonText: { color: '#FFF', fontWeight: 'bold' },
    commentModal: { backgroundColor: '#FFF', borderRadius: 15, height: '70%', padding: 20, elevation: 5 },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
    commentList: { flex: 1 },
    commentItem: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-start' },
    avatarPlaceholderMini: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarTextMini: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    commentContent: { flex: 1, backgroundColor: '#F5F5F5', padding: 10, borderRadius: 12 },
    commentUser: { fontWeight: 'bold', fontSize: 14, color: '#3E2723', marginBottom: 2 },
    commentText: { fontSize: 14, color: '#424242' },
    commentInputRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10, marginBottom: 10 },
    commentInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, maxHeight: 100 },
    sendButton: { padding: 5 },
    emptyComments: { alignItems: 'center', padding: 20 },
    emptyCommentsText: { color: '#9E9E9E', fontSize: 14 },
    actionButton: { marginRight: 16, flexDirection: 'row', alignItems: 'center' },
    commentBadge: { fontSize: 12, color: '#757575', marginLeft: 4 }
});
