import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, C, IconButton, Txt } from "./ui";

type Props = {
  kind: "publicación" | "reel" | "historia" | "repost";
  onDelete?: () => Promise<void>;
  saved?: { active: boolean; toggle: () => void };
  shareMessage?: string;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export function ContentOptions({
  kind,
  onDelete,
  saved,
  shareMessage,
  onOpenChange,
  style,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const insets = useSafeAreaInsets();
  const label = kind.toUpperCase();
  const close = () => {
    if (pending.current) return;
    setOpen(false);
    setConfirm(false);
    setError("");
    onOpenChange?.(false);
  };
  const remove = async () => {
    if (!onDelete || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onDelete();
      pending.current = false;
      close();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo eliminar. Inténtalo de nuevo.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <IconButton
        name="more-horizontal"
        label={`Opciones de ${kind}`}
        onPress={() => {
          setOpen(true);
          onOpenChange?.(true);
        }}
        style={style}
      />
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.scrim} onPress={close}>
          <Pressable
            accessibilityViewIsModal
            style={[
              styles.sheet,
              { paddingBottom: Math.max(25, insets.bottom) },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <Txt display style={{ fontSize: 24, marginBottom: 6 }}>
                {confirm
                  ? `¿ELIMINAR ${label}?`
                  : kind === "publicación"
                    ? "ESTE CORTE"
                    : kind === "historia"
                      ? "ESTA HISTORIA"
                      : kind === "repost"
                        ? "ESTE REPOST"
                        : "ESTE REEL"}
              </Txt>
              {confirm ? (
                <>
                  <Txt style={{ lineHeight: 23 }}>
                    {kind === "repost"
                      ? "Se quitará tu repost sin modificar la publicación original."
                      : "Dejará de aparecer en CUT para todos. Esta acción no se puede deshacer."}
                  </Txt>
                  {!!error && (
                    <Txt accessibilityRole="alert" style={{ color: "#ffbd9d" }}>
                      {error}
                    </Txt>
                  )}
                  <Button
                    secondary
                    icon="trash-2"
                    disabled={busy}
                    onPress={() => void remove()}
                  >
                    {busy ? "ELIMINANDO…" : "SÍ, ELIMINAR"}
                  </Button>
                  <Button disabled={busy} onPress={close}>
                    CANCELAR
                  </Button>
                </>
              ) : (
                <>
                  {saved && (
                    <Button
                      secondary
                      icon="bookmark"
                      onPress={() => {
                        saved.toggle();
                        close();
                      }}
                    >
                      {saved.active
                        ? "QUITAR DE GUARDADOS"
                        : kind === "reel"
                          ? "GUARDAR REEL"
                          : "GUARDAR CORTE"}
                    </Button>
                  )}
                  {!!shareMessage && (
                    <Button
                      secondary
                      icon="share-2"
                      onPress={() => {
                        close();
                        void Share.share({ message: shareMessage }).catch(
                          () => {},
                        );
                      }}
                    >
                      COMPARTIR
                    </Button>
                  )}
                  {!!onDelete && (
                    <Button
                      secondary
                      icon="trash-2"
                      onPress={() => setConfirm(true)}
                    >
                      {`ELIMINAR ${label}`}
                    </Button>
                  )}
                  <Button onPress={close}>LISTO</Button>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    padding: 25,
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
    backgroundColor: C.raised,
    borderTopWidth: 2,
    borderColor: C.green,
  },
});
