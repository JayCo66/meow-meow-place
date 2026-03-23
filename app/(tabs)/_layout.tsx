import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: '#FF9800',
            tabBarInactiveTintColor: '#A1887F',
            tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: '#EFEFEF',
                paddingBottom: 10,
                height: 80,
                paddingTop: 5,
            },
            headerStyle: {
                backgroundColor: '#FFF8E1',
            },
            headerTitleStyle: {
                fontWeight: 'bold',
                color: '#3E2723',
            },
            headerShadowVisible: false,
        }}>
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: 'Map',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <MaterialIcons name="map" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="pet"
                options={{
                    title: 'My Pets',
                    headerTitle: 'สัตว์เลี้ยงของฉัน',
                    tabBarIcon: ({ color }) => <MaterialIcons name="pets" size={28} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    headerTitle: 'โปรไฟล์ส่วนตัว',
                    tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} />,
                }}
            />
        </Tabs>
    );
}
