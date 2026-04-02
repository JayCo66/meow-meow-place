import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const auth = getAuth();
    const user = auth.currentUser;
    const router = useRouter();

    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // States สำหรับโหมดแก้ไข
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData(data);
                        setEditName(data.name || user.displayName || '');
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user]);

    const handleLogout = () => {
        auth.signOut();
        router.replace('/login');
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        if (!editName.trim()) {
            Alert.alert('ข้อผิดพลาด', 'กรุณาระบุชื่อของคุณด้วยครับ');
            return;
        }

        setSaving(true);
        try {
            // 1. อัปเดตใน Firebase Auth
            await updateProfile(user, { displayName: editName });

            // 2. อัปเดตใน Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { name: editName });

            // อัปเดต UI ชั่วคราวบนหน้าจอ โดยไม่ต้องโหลดใหม่
            setUserData((prev: any) => ({ ...prev, name: editName }));

            Alert.alert('สำเร็จ', 'อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว');
            setIsEditing(false);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            Alert.alert('เกิดข้อผิดพลาด', error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#FF9800" />
                </View>
            </SafeAreaView>
        );
    }

    const displayName = userData?.name || user?.displayName || 'User';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={{ width: 28 }} />
                <Text style={styles.headerTitle}>ข้อมูลส่วนตัว</Text>
                {!isEditing ? (
                    <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <MaterialIcons name="edit" size={28} color="#FF9800" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => {
                        setIsEditing(false);
                        setEditName(userData?.name || user?.displayName || '');
                    }}>
                        <MaterialIcons name="close" size={28} color="#757575" />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.profileHeader}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>

                        {/* โหมดแก้ไขชื่อ VS โหมดดูข้อมูลปกติ */}
                        {isEditing ? (
                            <TextInput
                                style={styles.editNameInput}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="ชื่อแสดงผล"
                                autoFocus
                                placeholderTextColor="#9E9E9E"
                            />
                        ) : (
                            <Text style={styles.name}>{displayName}</Text>
                        )}

                        <Text style={styles.email}>{userData?.email || user?.email}</Text>
                    </View>

                    {/* กล่องข้อมูล */}
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
                        <View style={styles.infoBox}>

                            <View style={styles.infoRow}>
                                <View style={styles.labelRow}>
                                    <MaterialIcons name="email" size={20} color="#9E9E9E" style={styles.infoIcon} />
                                    <Text style={styles.infoLabel}>อีเมล:</Text>
                                </View>
                                <Text style={styles.infoValueRestricted}>{userData?.email || user?.email}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <View style={styles.labelRow}>
                                    <MaterialIcons name="security" size={20} color="#9E9E9E" style={styles.infoIcon} />
                                    <Text style={styles.infoLabel}>บทบาท:</Text>
                                </View>
                                <Text style={styles.infoValue}>{userData?.role === 'admin' ? 'แอดมิน (Admin)' : 'สมาชิกทั่วไป'}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <View style={styles.labelRow}>
                                    <MaterialIcons name="event" size={20} color="#9E9E9E" style={styles.infoIcon} />
                                    <Text style={styles.infoLabel}>วันที่สมัคร:</Text>
                                </View>
                                <Text style={styles.infoValue}>
                                    {userData?.createdAt?.seconds
                                        ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                                        : '-'}
                                </Text>
                            </View>

                            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                <View style={styles.labelRow}>
                                    <MaterialIcons name="pets" size={20} color="#9E9E9E" style={styles.infoIcon} />
                                    <Text style={styles.infoLabel}>สัตว์เลี้ยง (My Pets):</Text>
                                </View>
                                <Text style={styles.infoValue}>{userData?.pets ? userData.pets.length : 0} ตัว</Text>
                            </View>
                        </View>
                        {/* คำเตือนเรื่องการเปลี่ยนอีเมล */}
                        <Text style={styles.noticeText}>* อีเมลที่ใช้ลงทะเบียนไม่สามารถเปลี่ยนแปลงได้</Text>
                    </View>

                    {/* ปุ่ม Action ด้านล่าง ปรับตามโหมด */}
                    <View style={styles.footerContainer}>
                        {isEditing ? (
                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
                                {saving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>บันทึกข้อมูล</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                                <Text style={styles.logoutText}>ออกจากระบบ</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8E1' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF8E1',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3E2723',
    },

    profileHeader: { alignItems: 'center', marginBottom: 30 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FF9800', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
    avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },

    name: { fontSize: 24, fontWeight: 'bold', color: '#3E2723', marginBottom: 6 },
    editNameInput: { fontSize: 24, fontWeight: 'bold', color: '#FF9800', borderBottomWidth: 2, borderBottomColor: '#FF9800', paddingVertical: 4, paddingHorizontal: 12, minWidth: 150, textAlign: 'center', marginBottom: 6 },
    email: { fontSize: 14, color: '#757575' },

    infoSection: { marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E2723', marginBottom: 12 },
    infoBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    labelRow: { flexDirection: 'row', alignItems: 'center' },
    infoIcon: { marginRight: 8 },
    infoLabel: { fontSize: 15, color: '#757575' },
    infoValue: { fontSize: 15, color: '#3E2723', fontWeight: '600' },
    infoValueRestricted: { fontSize: 15, color: '#9E9E9E', fontWeight: '500', fontStyle: 'italic' },
    noticeText: { fontSize: 12, color: '#9E9E9E', marginTop: 8, fontStyle: 'italic', textAlign: 'right' },

    footerContainer: { marginTop: 'auto', paddingTop: 20 },
    logoutButton: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
    logoutText: { color: '#F44336', fontSize: 16, fontWeight: 'bold' },

    saveButton: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
