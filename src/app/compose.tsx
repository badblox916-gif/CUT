import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  Avatar,
  BackHeader,
  Button,
  C,
  Icon,
  IconButton,
  Page,
  Txt,
  s,
} from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { persistMedia } from "@/lib/media";
import type { ImagePickerAsset } from "expo-image-picker";

export default function ComposeScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const reel = type === "reel";
  const social = useSocial();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<ImagePickerAsset>();
  const [poll, setPoll] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const publishing = useRef(false);
  const pickMedia = async () => {
    try {
      setError("");
      if (reel && Platform.OS === "ios") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(
            "Permite el acceso a tus videos en los ajustes del dispositivo.",
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: reel ? ["videos"] : ["images"],
        quality: 0.8,
      });
      if (!result.canceled) {
        setMedia(result.assets[0]);
        setPoll(false);
      }
    } catch {
      setError("No pudimos abrir tu galería. Vuelve a intentarlo.");
    }
  };
  const publish = async () => {
    if (publishing.current) return;
    if (!text.trim() && !media) {
      setError("Escribe algo o añade una foto para crear tu corte.");
      return;
    }
    if (reel && !media) {
      setError("Selecciona un video para crear tu reel.");
      return;
    }
    if (
      poll &&
      (options.some((option) => !option.trim()) ||
        options[0].trim().toLowerCase() === options[1].trim().toLowerCase())
    ) {
      setError("La encuesta necesita dos opciones diferentes.");
      return;
    }
    publishing.current = true;
    setBusy(true);
    try {
      const uri = media ? await persistMedia(media) : undefined;
      social.publish({
        text: text.trim(),
        imageUri: reel ? undefined : uri,
        videoUri: reel ? uri : undefined,
        reel,
        poll: poll
          ? { options: options.map((option) => option.trim()), votes: [0, 0] }
          : undefined,
      });
      router.dismissTo(reel ? "/reels" : "/");
    } catch {
      setError(
        "No se pudo guardar el archivo. Revisa el espacio disponible y vuelve a intentarlo.",
      );
    } finally {
      setBusy(false);
      publishing.current = false;
    }
  };
  return (
    <Page header={false}>
      <BackHeader title={reel ? "NUEVO REEL" : "NUEVO CORTE"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={s.row}>
            <Avatar me />
            <View>
              <Txt style={{ fontWeight: "700" }}>{social.profile.name}</Txt>
              <Txt style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
                @{social.profile.handle} · Para la comunidad
              </Txt>
            </View>
          </View>
          <Txt display style={{ fontSize: 38, marginTop: 27, lineHeight: 46 }}>
            {reel
              ? "DALE PLAY\nA TU MUNDO."
              : "LAS BUENAS IDEAS\nNO PIDEN PERMISO."}
          </Txt>
          <TextInput
            accessibilityLabel="Contenido de la publicación"
            multiline
            maxLength={500}
            value={text}
            onChangeText={setText}
            placeholder="¿Qué vas a cortar hoy en CUT?"
            placeholderTextColor={C.muted}
            style={[
              s.input,
              {
                minHeight: 160,
                textAlignVertical: "top",
                marginTop: 20,
                lineHeight: 28,
              },
            ]}
          />
          <Txt
            style={{
              textAlign: "right",
              color: text.length > 470 ? C.green : C.muted,
              fontSize: 13,
              marginTop: 7,
            }}
          >
            {text.length} / 500
          </Txt>
          <View style={styles.tools}>
            <IconButton
              name={reel ? "video" : "image"}
              label={reel ? "Seleccionar video" : "Añadir foto"}
              onPress={pickMedia}
              active={!!media}
            />
            <IconButton
              name="smile"
              label="Añadir emoji"
              active={emojiOpen}
              onPress={() => setEmojiOpen(!emojiOpen)}
            />
            <IconButton
              name="hash"
              label="Añadir hashtag"
              onPress={() => setText((text + " #").slice(0, 500))}
            />
            {!reel && (
              <IconButton
                name="bar-chart-2"
                label="Crear encuesta"
                active={poll}
                onPress={() => {
                  setPoll(!poll);
                  setMedia(undefined);
                }}
              />
            )}
          </View>
          {emojiOpen && (
            <View style={styles.emoji}>
              {["✂️", "🔥", "🛹", "🎧", "💚", "✨", "📸", "⚡"].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => setText((text + emoji).slice(0, 500))}
                  style={{ padding: 10 }}
                >
                  <Txt style={{ fontSize: 24 }}>{emoji}</Txt>
                </Pressable>
              ))}
            </View>
          )}
          {media && (
            <View style={styles.preview}>
              {reel ? (
                <View style={{ padding: 25, gap: 12, alignItems: "center" }}>
                  <Icon name="film" size={36} color={C.green} />
                  <Txt>{media.fileName ?? "Tu video está listo"}</Txt>
                  <Txt style={{ color: C.muted, fontSize: 14 }}>
                    Se publicará en Reels
                  </Txt>
                </View>
              ) : (
                <Image
                  source={{ uri: media.uri }}
                  style={{ height: 230, width: "100%" }}
                  contentFit="cover"
                />
              )}
              <IconButton
                name="x"
                label="Quitar archivo"
                onPress={() => setMedia(undefined)}
                style={{ position: "absolute", top: 8, right: 8 }}
              />
            </View>
          )}
          {reel && !media && (
            <Button secondary icon="video" onPress={pickMedia}>
              SELECCIONAR VIDEO
            </Button>
          )}
          {poll && (
            <View style={{ gap: 10, padding: 15, backgroundColor: C.panel }}>
              <Txt display style={{ color: C.green, fontSize: 17 }}>
                LA COMUNIDAD DECIDE
              </Txt>
              {options.map((option, index) => (
                <TextInput
                  key={index}
                  accessibilityLabel={"Opción " + (index + 1)}
                  value={option}
                  maxLength={50}
                  onChangeText={(value) =>
                    setOptions(options.map((o, i) => (i === index ? value : o)))
                  }
                  placeholder={"Opción " + (index + 1)}
                  placeholderTextColor={C.muted}
                  style={s.input}
                />
              ))}
            </View>
          )}
          {!!error && (
            <Txt
              accessibilityRole="alert"
              style={{ color: "#ffbd9d", lineHeight: 25 }}
            >
              {error}
            </Txt>
          )}
          <Button
            icon="scissors"
            disabled={busy || (!text.trim() && !media)}
            onPress={publish}
            style={{ marginTop: 18, minHeight: 48 }}
          >
            {busy ? "PUBLICANDO…" : "PUBLICAR CORTE"}
          </Button>
          <Txt
            style={{
              textAlign: "center",
              color: C.muted,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            TU VOZ. TU ESTILO. TU CORTE.
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
    </Page>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  tools: { flexDirection: "row", gap: 10 },
  emoji: { flexDirection: "row", flexWrap: "wrap", backgroundColor: C.panel },
  preview: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
});
