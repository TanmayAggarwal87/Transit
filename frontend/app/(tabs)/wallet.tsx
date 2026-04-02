import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Wallet Screen Placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: Colors.textSecondary,
  }
});
