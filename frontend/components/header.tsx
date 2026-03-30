import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'

const Header = () => {
    return (
        <SafeAreaView style={styles.container}>

            <View>
                <Text style={styles.logo}>Transit</Text>
            </View>

            <View style={styles.right}>
                <View>
                    <Text>header</Text>
                </View>
                <View>
                    <Text>header</Text>
                </View>
            </View>

        </SafeAreaView>
    )
}

export default Header

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 4,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: "#fff",
    },
    logo: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#0f172a",
    },
    right: {
        display: "flex",
        flexDirection: "row",
        gap: 16,
    }
})