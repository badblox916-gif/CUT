import { useLocalSearchParams } from "expo-router";
import { ProfileScreen } from "@/components/cut/profile-screen";

export default function CreatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileScreen key={id} id={id} />;
}
