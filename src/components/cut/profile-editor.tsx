import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Avatar, BackHeader, Button, C, Icon, Page, Txt, s } from "./ui";
import { ProfileCover } from "./profile-cover";
import { useAuth } from "@/context/auth";
import { useSocial } from "@/context/social";
import { profileError } from "@/lib/profile";

export function ProfileEditor({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { profile, updateProfile } = useSocial();
  const { signOut } = useAuth();
  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);
  const [coverUri, setCoverUri] = useState(profile.coverUri);
  const [error, setError] = useState("");
  const [operation, setOperation] = useState<
    "image" | "save" | "sign-out" | null
  >(null);
  const working = useRef(false);
  const busy = operation !== null;

  const changeImage = async (target: "avatar" | "cover") => {
    if (working.current) return;
    working.current = true;
    setOperation("image");
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        // iOS only offers a square crop; keep the whole cover there.
        allowsEditing: target === "avatar" || Platform.OS === "android",
        aspect: target === "avatar" ? [1, 1] : [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (target === "avatar") setAvatarUri(uri);
        else setCoverUri(uri);
      }
    } catch {
      setError("No se pudo guardar la imagen. Inténtalo de nuevo.");
    } finally {
      working.current = false;
      setOperation(null);
    }
  };

  const save = async () => {
    if (working.current) return;
    const next = {
      name: name.trim(),
      handle: handle.trim(),
      bio: bio.trim(),
      avatarUri,
      coverUri,
    };
    const validation = profileError(next);
    setError(validation);
    if (validation) return;
    working.current = true;
    setOperation("save");
    try {
      await updateProfile(next);
      // Onboarding is removed from the stack only after the profile is saved.
      if (!onboarding) {
        if (router.canGoBack()) router.back();
        else router.replace("/profile");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar tu perfil. Inténtalo de nuevo.",
      );
    } finally {
      working.current = false;
      setOperation(null);
    }
  };

  const leave = async () => {
    if (working.current) return;
    working.current = true;
    setOperation("sign-out");
    setError("");
    try {
      await signOut();
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
    } finally {
      working.current = false;
      setOperation(null);
    }
  };

  return (
    <Page header={false}>
      {onboarding ? (
        <View style={styles.header}>
          <View style={s.logo}>
            <Txt display style={{ fontSize: 27, color: C.black }}>
              CUT
            </Txt>
            <Icon name="scissors" color={C.black} />
          </View>
          <Txt style={styles.step}>PASO 2 DE 2</Txt>
        </View>
      ) : (
        <BackHeader title="TU IDENTIDAD" />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {onboarding && (
            <View style={{ gap: 10 }}>
              <Txt display style={styles.title}>
                HAZLO TUYO.
              </Txt>
              <Txt style={styles.description}>
                Personaliza tu perfil antes de entrar a CUT. Así te verá la
                comunidad.
              </Txt>
            </View>
          )}
          <View>
            <ProfileCover uri={coverUri} style={styles.cover}>
              {!coverUri && (
                <View style={styles.coverPlaceholder}>
                  <Icon name="image" size={28} />
                  <Txt display style={{ fontSize: 20 }}>
                    TU ESPACIO, TU ESTILO.
                  </Txt>
                </View>
              )}
            </ProfileCover>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Avatar me size={86} uri={avatarUri ?? ""} />
              </View>
              <Txt style={styles.imageHint}>
                Tu foto y portada son opcionales.
              </Txt>
            </View>
          </View>
          <View style={styles.imageButtons}>
            <Button
              secondary
              icon="camera"
              disabled={busy}
              onPress={() => void changeImage("avatar")}
              style={{ flex: 1 }}
            >
              {avatarUri ? "CAMBIAR FOTO" : "AÑADIR FOTO"}
            </Button>
            <Button
              secondary
              icon="image"
              disabled={busy}
              onPress={() => void changeImage("cover")}
              style={{ flex: 1 }}
            >
              {coverUri ? "CAMBIAR PORTADA" : "AÑADIR PORTADA"}
            </Button>
          </View>
          {(avatarUri || coverUri) && (
            <View style={styles.imageButtons}>
              {avatarUri && (
                <Button
                  secondary
                  disabled={busy}
                  onPress={() => setAvatarUri(undefined)}
                  style={{ flex: 1 }}
                >
                  QUITAR FOTO
                </Button>
              )}
              {coverUri && (
                <Button
                  secondary
                  disabled={busy}
                  onPress={() => setCoverUri(undefined)}
                  style={{ flex: 1 }}
                >
                  QUITAR PORTADA
                </Button>
              )}
            </View>
          )}
          {operation === "image" && (
            <Txt accessibilityLiveRegion="polite" style={styles.hint}>
              Preparando imagen…
            </Txt>
          )}
          <View style={styles.field}>
            <Txt display style={styles.label}>
              NOMBRE
            </Txt>
            <TextInput
              accessibilityLabel="Nombre"
              placeholder="¿Cómo te llamas?"
              placeholderTextColor={C.muted}
              maxLength={40}
              value={name}
              onChangeText={setName}
              editable={!busy}
              autoComplete="name"
              style={s.input}
            />
          </View>
          <View style={styles.field}>
            <Txt display style={styles.label}>
              USUARIO
            </Txt>
            <View style={styles.handle}>
              <Txt style={{ color: C.green, paddingLeft: 14 }}>@</Txt>
              <TextInput
                accessibilityLabel="Usuario"
                placeholder="tu.usuario"
                placeholderTextColor={C.muted}
                maxLength={24}
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                style={[s.input, { flex: 1, borderWidth: 0 }]}
              />
            </View>
            <Txt style={styles.hint}>
              De 3 a 24 letras, números, puntos o guiones bajos.
            </Txt>
          </View>
          <View style={styles.field}>
            <Txt display style={styles.label}>
              BIOGRAFÍA · OPCIONAL
            </Txt>
            <TextInput
              accessibilityLabel="Biografía"
              placeholder="Cuéntanos algo de ti…"
              placeholderTextColor={C.muted}
              maxLength={180}
              value={bio}
              onChangeText={setBio}
              editable={!busy}
              multiline
              style={[s.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
            <Txt style={[styles.hint, { textAlign: "right" }]}>
              {bio.length} / 180
            </Txt>
          </View>
          {!!error && (
            <Txt
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: "#ffbd9d", lineHeight: 24 }}
            >
              {error}
            </Txt>
          )}
          <Button disabled={busy} icon="check" onPress={() => void save()}>
            {operation === "save"
              ? "GUARDANDO…"
              : onboarding
                ? "GUARDAR Y ENTRAR"
                : "GUARDAR CAMBIOS"}
          </Button>
          <Txt style={[styles.hint, { textAlign: "center" }]}>
            Puedes cambiar tu perfil cuando quieras.
          </Txt>
          {onboarding && (
            <Button secondary disabled={busy} onPress={() => void leave()}>
              CERRAR SESIÓN
            </Button>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 22,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  step: { color: C.mint, fontSize: 12, letterSpacing: 1 },
  content: { padding: 22, gap: 20, paddingBottom: 40 },
  title: { fontSize: 36, letterSpacing: 0.5 },
  description: { fontSize: 16, lineHeight: 25, color: C.muted },
  cover: { height: 160, borderWidth: 1, borderColor: C.line },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  avatarRow: {
    marginTop: -30,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  avatar: {
    borderWidth: 4,
    borderColor: C.bg,
    transform: [{ rotate: "-3deg" }],
  },
  imageHint: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    paddingBottom: 5,
  },
  imageButtons: { flexDirection: "row", gap: 10 },
  field: { gap: 10 },
  label: { fontSize: 14, letterSpacing: 1, color: C.mint },
  hint: { color: C.muted, fontSize: 13, lineHeight: 20 },
  handle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
  },
});
