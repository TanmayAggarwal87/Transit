import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '@/constants/theme';

export default function Header() {
    const insets = useSafeAreaInsets();
    
    return (
        <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 20) }]}>
            <Text style={styles.brandName}>Transit</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    headerContainer: {
        width: '100%',
        backgroundColor: Colors.surfacePrimary,
        paddingBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderSubtle,
        zIndex: 10,
    },
    brandName: {
        ...Typography.headingM,
        color: Colors.textPrimary,
        letterSpacing: 2, // A bit of tracking to look sleek
        textTransform: 'uppercase', // Often looks more professional built this way
    },
});