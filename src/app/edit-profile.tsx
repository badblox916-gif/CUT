import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Page,
  Txt,
  s,
} from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { persistMedia } from "@/lib/media";
export default function EditProfileScreen() {
  const { profile, updateProfile } = useSocial();
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const changeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled) {
        setBusy(true);
        setAvatarUri(await persistMedia(result.assets[0]));
      }
    } catch {
      setError("No se pudo guardar la foto. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };
  const save = () => {
    if (!name.trim()) {
      setError("Tu nombre no puede estar vacío.");
      return;
    }
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(handle)) {
      setError(
        "El usuario debe tener entre 3 y 24 letras, números, puntos o guiones bajos.",
      );
      return;
    }
    updateProfile({ name: name.trim(), handle, bio: bio.trim(), avatarUri });
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  };
  return (
    <Page header={false}>
      <BackHeader title="TU IDENTIDAD" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 22, gap: 18, paddingBottom: 40 }}
        >
          <View style={{ alignItems: "center", gap: 15, paddingVertical: 12 }}>
            <Avatar me size={90} uri={avatarUri} />
            <Button
              secondary
              icon="image"
              disabled={busy}
              onPress={changeAvatar}
            >
              {busy ? "GUARDANDO…" : "CAMBIAR FOTO"}
            </Button>
          </View>
          <Txt
            display
            style={{ fontSize: 14, letterSpacing: 1, color: C.mint }}
          >
            NOMBRE
          </Txt>
          <TextInput
            accessibilityLabel="Nombre"
            maxLength={40}
            value={name}
            onChangeText={setName}
            style={s.input}
          />
          <Txt
            display
            style={{ fontSize: 14, letterSpacing: 1, color: C.mint }}
          >
            USUARIO
          </Txt>
          <TextInput
            accessibilityLabel="Usuario"
            maxLength={24}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
          />
          <Txt
            display
            style={{ fontSize: 14, letterSpacing: 1, color: C.mint }}
          >
            BIOGRAFÍA
          </Txt>
          <TextInput
            accessibilityLabel="Biografía"
            maxLength={180}
            value={bio}
            onChangeText={setBio}
            multiline
            style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
          />
          <Txt style={{ color: C.muted, fontSize: 13, textAlign: "right" }}>
            {bio.length} / 180
          </Txt>
          {!!error && (
            <Txt accessibilityRole="alert" style={{ color: "#ffbd9d" }}>
              {error}
            </Txt>
          )}
          <Button disabled={busy} icon="check" onPress={save}>
            GUARDAR CAMBIOS
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
