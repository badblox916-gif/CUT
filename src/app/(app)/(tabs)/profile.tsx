import { ProfileScreen } from "@/components/cut/profile-screen";
import { useSocial } from "@/context/social";

export default function MyProfileScreen() {
  const { accountId } = useSocial();
  return <ProfileScreen id={accountId} />;
}
