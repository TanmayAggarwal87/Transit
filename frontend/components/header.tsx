import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Typography } from '@/constants/theme'
import { Ionicons } from '@expo/vector-icons'


const Header = () => {
    const insets = useSafeAreaInsets();
    return (


        <View style={[styles.topBar, { top: Math.max(insets.top, 20) }]}>
            <View style={styles.topBarContent}>
                <Text style={styles.brandName}>Transit</Text>
                <TouchableOpacity style={styles.avatarButton}>
                    <Ionicons name="person" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>


    )
}

export default Header

const styles = StyleSheet.create({
    topBar: {
        position: 'absolute',
        left: 24,
        right: 24,
        zIndex: 10,

    },
    topBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandName: {
        ...Typography.headingM,
        color: Colors.textPrimary,
    },
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.borderActive,
        backgroundColor: Colors.surfaceTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
})