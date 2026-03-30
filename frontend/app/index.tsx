import { StyleSheet, Text, View } from "react-native";
import Header from "@/components/header";
export default function Index() {
  return (
    <View
      style={style.container}
    >
      <Header />
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
}); 
