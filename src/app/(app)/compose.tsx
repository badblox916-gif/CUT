import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  ActivityIndicator,
  Linking,
  Modal,
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
  IconButton,
  Page,
  Txt,
  s,
} from "@/components/cut/ui";
import { useSocial } from "@/context/social";
import { useStories } from "@/context/stories";
import type { ImagePickerAsset } from "expo-image-picker";
import { MediaVideo } from "@/components/cut/media-video";
import {
  CameraPermissionError,
  captureMedia,
  checkedMedia,
  RECORDING_SECONDS,
  type CaptureKind,
} from "@/lib/capture-media";
import { optimizePickedMedia } from "@/lib/optimize-media";
import type { UploadProgress } from "@/lib/upload-request";

type PendingDraft = {
  mode: string;
  text: string;
  media?: ImagePickerAsset;
  poll: boolean;
  options: string[];
  capture?: CaptureKind;
  createdAt: number;
};

export default function ComposeScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const reel = type === "reel";
  const story = type === "story";
  const social = useSocial();
  const { publishStory } = useStories();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<ImagePickerAsset>();
  const [poll, setPoll] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const [cameraSettings, setCameraSettings] = useState(false);
  const [cameraMenu, setCameraMenu] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>();
  const uploadController = useRef<AbortController | null>(null);
  const pendingCapture = useRef<CaptureKind | undefined>(undefined);
  const publishing = useRef(false);
  const selecting = useRef(false);
  const pickSequence = useRef(0);
  const edited = useRef(false);
  const maxTextLength = story ? 180 : 500;
  const isVideo = reel || media?.type === "video";
  const mode = story ? "story" : reel ? "reel" : "post";
  const draftKey = `cut-pending-capture:${social.accountId}`;
  const canEdit = !busy && !pickerBusy;
  const percent =
    progress?.phase === "sending" && progress.total
      ? Math.min(100, Math.round(((progress.sent ?? 0) / progress.total) * 100))
      : undefined;
  const publicationLabel =
    progress?.phase === "saving"
      ? "GUARDANDO…"
      : progress?.phase === "processing"
        ? "PROCESANDO ARCHIVO…"
        : percent !== undefined
          ? `SUBIENDO ${percent}%`
          : "SUBIENDO…";
  useEffect(() => () => uploadController.current?.abort(), []);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let active = true;
    void (async () => {
      const raw = await AsyncStorage.getItem(draftKey);
      if (!raw || !active || edited.current) return;
      const pending = JSON.parse(raw) as PendingDraft;
      if (pending.mode !== mode) return;
      if (
        !Number.isFinite(pending.createdAt) ||
        Date.now() - pending.createdAt > 60 * 60 * 1000
      ) {
        await AsyncStorage.removeItem(draftKey);
        return;
      }
      const result = await ImagePicker.getPendingResultAsync();
      await AsyncStorage.removeItem(draftKey);
      if (!active || edited.current || !result) return;
      setText(
        typeof pending.text === "string"
          ? pending.text.slice(0, maxTextLength)
          : "",
      );
      setOptions(
        Array.isArray(pending.options) && pending.options.length === 2
          ? pending.options.map((item) => String(item).slice(0, 50))
          : ["", ""],
      );
      setPoll(Boolean(pending.poll));
      if (pending.media) setMedia(checkedMedia(pending.media, reel));
      if ("code" in result)
        throw new Error(
          "No pudimos recuperar la captura. Abre la cámara de nuevo.",
        );
      if (!result.canceled && result.assets[0]) {
        setMedia(checkedMedia(result.assets[0], reel, pending.capture));
        setPoll(false);
      }
    })().catch(() => {
      if (active)
        setError(
          "No pudimos recuperar la captura. Abre la cámara o la galería de nuevo.",
        );
    });
    return () => {
      active = false;
    };
  }, [draftKey, mode, maxTextLength, reel]);
  const chooseMedia = async (capture?: CaptureKind) => {
    if (publishing.current || selecting.current) return;
    edited.current = true;
    // Browsers may never report dialog cancellation. Keep the editor usable on
    // web and discard obsolete dialog results instead of leaving it locked.
    selecting.current = Platform.OS !== "web";
    setPickerBusy(Platform.OS !== "web");
    const sequence = ++pickSequence.current;
    try {
      setError("");
      setCameraSettings(false);
      if (Platform.OS === "android") {
        const pending: PendingDraft = {
          mode,
          text,
          media,
          poll,
          options,
          capture,
          createdAt: Date.now(),
        };
        await AsyncStorage.setItem(draftKey, JSON.stringify(pending));
      }
      if (!capture && Platform.OS === "ios") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError(
            "Permite el acceso a tus videos en los ajustes del dispositivo.",
          );
          return;
        }
      }
      const result = capture
        ? await captureMedia(ImagePicker, capture, Platform.OS === "web")
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: reel ? ["videos"] : ["images", "videos"],
            quality: 0.8,
          });
      if (sequence !== pickSequence.current || publishing.current) return;
      if (!result.canceled && result.assets[0]) {
        selecting.current = true;
        setPickerBusy(true);
        const asset = result.assets[0];
        const candidate = checkedMedia(
          {
            ...asset,
            fileSize: asset.type === "video" ? asset.fileSize : undefined,
          },
          reel,
          capture,
        );
        const prepared = await optimizePickedMedia({
          ...candidate,
          fileSize: asset.fileSize,
        });
        if (sequence !== pickSequence.current || publishing.current) return;
        setMedia(checkedMedia(prepared, reel, capture));
        setPoll(false);
      }
    } catch (cause) {
      if (cause instanceof CameraPermissionError) {
        setError(cause.message);
        setCameraSettings(cause.canOpenSettings);
      } else {
        const code = (cause as { code?: string })?.code;
        setError(
          code
            ? capture
              ? "No pudimos abrir la cámara. Revisa sus permisos e inténtalo de nuevo."
              : "No pudimos abrir tu galería. Vuelve a intentarlo."
            : cause instanceof Error
              ? cause.message
              : "No pudimos abrir el archivo. Vuelve a intentarlo.",
        );
      }
    } finally {
      selecting.current = false;
      setPickerBusy(false);
      if (Platform.OS === "android")
        await AsyncStorage.removeItem(draftKey).catch(() => {});
    }
  };
  const pickMedia = () => void chooseMedia();
  const launchPendingCapture = () => {
    const capture = pendingCapture.current;
    pendingCapture.current = undefined;
    if (capture) void chooseMedia(capture);
  };
  const chooseCapture = (capture: CaptureKind) => {
    pendingCapture.current = capture;
    setCameraMenu(false);
    if (Platform.OS !== "ios") launchPendingCapture();
  };
  const publish = async () => {
    if (publishing.current || selecting.current) return;
    if (story && !media) {
      setError("Selecciona una foto o un video para tu historia.");
      return;
    }
    if (!text.trim() && !media) {
      setError("Escribe algo o añade una foto o video para crear tu corte.");
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
    setError("");
    setProgress(undefined);
    const controller = new AbortController();
    uploadController.current = controller;
    const uploadOptions = {
      signal: controller.signal,
      onProgress: setProgress,
    };
    try {
      const uri = media?.uri;
      if (story)
        await publishStory(
          {
            text: text.trim(),
            imageUri: isVideo ? undefined : uri,
            videoUri: isVideo ? uri : undefined,
          },
          uploadOptions,
        );
      else
        await social.publish(
          {
            text: text.trim(),
            imageUri: isVideo ? undefined : uri,
            videoUri: isVideo ? uri : undefined,
            reel,
            poll: poll
              ? {
                  options: options.map((option) => option.trim()),
                  votes: [0, 0],
                }
              : undefined,
          },
          uploadOptions,
        );
      uploadController.current = null;
      router.dismissTo(reel ? "/reels" : "/");
    } catch (cause) {
      setError(
        controller.signal.aborted
          ? "La subida se canceló. Tu borrador sigue aquí."
          : cause instanceof Error
            ? cause.message
            : "No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
      publishing.current = false;
      uploadController.current = null;
    }
  };
  return (
    <Page header={false}>
      <BackHeader
        title={story ? "NUEVA HISTORIA" : reel ? "NUEVO REEL" : "NUEVO CORTE"}
      />
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
              <Txt style={{ fontWeight: "700" }}>
                {social.profile.name || "Tu perfil"}
              </Txt>
              <Txt style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
                {social.profile.handle
                  ? `@${social.profile.handle} · ${story ? "Para tus seguidores · 24 horas" : "Para la comunidad"}`
                  : "Para la comunidad"}
              </Txt>
            </View>
          </View>
          <Txt display style={{ fontSize: 38, marginTop: 27, lineHeight: 46 }}>
            {story
              ? "UN MOMENTO\nDE TU DÍA."
              : reel
                ? "DALE PLAY\nA TU MUNDO."
                : "LAS BUENAS IDEAS\nNO PIDEN PERMISO."}
          </Txt>
          <TextInput
            accessibilityLabel={
              story ? "Contenido de la historia" : "Contenido de la publicación"
            }
            multiline
            editable={canEdit}
            maxLength={maxTextLength}
            value={text}
            onChangeText={(value) => {
              edited.current = true;
              setText(value);
            }}
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
            {text.length} / {maxTextLength}
          </Txt>
          <View style={styles.tools}>
            <IconButton
              name="image"
              label={
                story
                  ? "Seleccionar foto o video"
                  : reel
                    ? "Seleccionar video"
                    : "Añadir foto o video"
              }
              onPress={pickMedia}
              active={!!media}
            />
            <IconButton
              name="camera"
              label="Abrir cámara"
              active={cameraMenu}
              onPress={() => {
                if (canEdit) setCameraMenu(true);
              }}
            />
            <IconButton
              name="smile"
              label="Añadir emoji"
              active={emojiOpen}
              onPress={() => {
                if (canEdit) {
                  edited.current = true;
                  setEmojiOpen(!emojiOpen);
                }
              }}
            />
            <IconButton
              name="hash"
              label="Añadir hashtag"
              onPress={() => {
                if (canEdit) {
                  edited.current = true;
                  setText((text + " #").slice(0, maxTextLength));
                }
              }}
            />
            {!reel && !story && (
              <IconButton
                name="bar-chart-2"
                label="Crear encuesta"
                active={poll}
                onPress={() => {
                  if (!canEdit) return;
                  edited.current = true;
                  setPoll(!poll);
                  setMedia(undefined);
                }}
              />
            )}
          </View>
          {pickerBusy && (
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <ActivityIndicator color={C.green} />
              <Txt style={{ color: C.muted }}>Preparando archivo…</Txt>
            </View>
          )}
          {emojiOpen && (
            <View style={styles.emoji}>
              {["✂️", "🔥", "🛹", "🎧", "💚", "✨", "📸", "⚡"].map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    if (canEdit) {
                      edited.current = true;
                      setText((text + emoji).slice(0, maxTextLength));
                    }
                  }}
                  style={{ padding: 10 }}
                >
                  <Txt style={{ fontSize: 24 }}>{emoji}</Txt>
                </Pressable>
              ))}
            </View>
          )}
          {media && (
            <View style={styles.preview}>
              {isVideo ? (
                <View style={{ gap: 12, paddingBottom: 15 }}>
                  <MediaVideo key={media.uri} uri={media.uri} />
                  <Txt>{media.fileName ?? "Tu video está listo"}</Txt>
                  <Txt style={{ color: C.muted, fontSize: 14 }}>
                    {story
                      ? "Disponible en tus historias durante 24 horas"
                      : reel
                        ? "Se publicará en Reels"
                        : "Se publicará como video en el inicio"}
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
                onPress={() => {
                  if (canEdit) {
                    edited.current = true;
                    ++pickSequence.current;
                    setMedia(undefined);
                  }
                }}
                style={{ position: "absolute", top: 8, right: 8 }}
              />
            </View>
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
                  editable={canEdit}
                  maxLength={50}
                  onChangeText={(value) => {
                    edited.current = true;
                    setOptions(
                      options.map((o, i) => (i === index ? value : o)),
                    );
                  }}
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
          {cameraSettings && Platform.OS !== "web" && (
            <Button
              secondary
              onPress={() => {
                void Linking.openSettings().catch(() =>
                  setError("No pudimos abrir los ajustes del dispositivo."),
                );
              }}
            >
              ABRIR AJUSTES
            </Button>
          )}
          <Button
            icon="scissors"
            disabled={
              !canEdit || (story || reel ? !media : !text.trim() && !media)
            }
            onPress={publish}
            style={{ marginTop: 18, minHeight: 48 }}
          >
            {busy
              ? publicationLabel
              : story
                ? "PUBLICAR HISTORIA"
                : "PUBLICAR CORTE"}
          </Button>
          {busy && (
            <View style={{ gap: 12 }}>
              {percent !== undefined ? (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Progreso de subida"
                  accessibilityValue={{ min: 0, max: 100, now: percent }}
                  style={{ height: 5, backgroundColor: C.line }}
                >
                  <View
                    style={{
                      width: `${percent}%`,
                      height: 5,
                      backgroundColor: C.green,
                    }}
                  />
                </View>
              ) : (
                <ActivityIndicator
                  accessibilityLabel={
                    progress?.phase === "saving"
                      ? "Guardando publicación"
                      : "Subiendo archivo"
                  }
                  color={C.green}
                />
              )}
              {progress?.phase !== "saving" && (
                <Button
                  secondary
                  onPress={() => uploadController.current?.abort()}
                >
                  CANCELAR SUBIDA
                </Button>
              )}
            </View>
          )}
          <Txt
            style={{
              textAlign: "center",
              color: C.muted,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            {story
              ? "Solo aparece a tus seguidores durante 24 horas."
              : "TU VOZ. TU ESTILO. TU CORTE."}
          </Txt>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={cameraMenu}
        animationType="none"
        onRequestClose={() => setCameraMenu(false)}
        onDismiss={() => {
          if (Platform.OS === "ios") launchPendingCapture();
        }}
      >
        <Pressable
          onPress={() => setCameraMenu(false)}
          style={{
            flex: 1,
            backgroundColor: "#000a",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              backgroundColor: C.raised,
              padding: 25,
              paddingBottom: 40,
              gap: 12,
              borderTopWidth: 2,
              borderColor: C.green,
            }}
          >
            <Txt display style={{ fontSize: 24 }}>
              USAR CÁMARA
            </Txt>
            {!reel && (
              <Button
                secondary
                icon="camera"
                onPress={() => chooseCapture("photo")}
              >
                TOMAR FOTO
              </Button>
            )}
            <Button
              secondary
              icon="video"
              onPress={() => chooseCapture("video")}
            >
              GRABAR VIDEO
            </Button>
            <Txt style={{ color: C.muted, fontSize: 13 }}>
              Videos de hasta {RECORDING_SECONDS} segundos.
            </Txt>
            <Button onPress={() => setCameraMenu(false)}>CANCELAR</Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Page>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emoji: { flexDirection: "row", flexWrap: "wrap", backgroundColor: C.panel },
  preview: { borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
});
