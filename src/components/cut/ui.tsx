import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
  type ColorValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSocial } from "@/context/social";
import { useNotifications } from "@/context/notifications";
import type { Creator } from "@/data/social";
import { useMedia } from "@/hooks/use-media";
import type { ComponentProps, ReactNode } from "react";

export const C = {
  bg: "#141716",
  panel: "#1e2221",
  raised: "#272d29",
  green: "#80d9a0",
  mint: "#b7dec7",
  text: "#f1f2e9",
  muted: "#91a298",
  line: "#39433d",
  black: "#070908",
};
export function Txt({
  style,
  display,
  ...props
}: TextProps & { display?: boolean }) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: display ? "Anton" : "Space",
          color: C.text,
          fontSize: 17,
        },
        style,
      ]}
    />
  );
}
export type IconName = ComponentProps<typeof Feather>["name"];
export function Icon({
  name,
  size = 20,
  color = C.mint,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const iconColor =
    typeof color === "number"
      ? `#${(color >>> 0).toString(16).padStart(8, "0")}`
      : (color ?? C.mint);
  return <Feather name={name} size={size} color={iconColor} />;
}
export function IconButton({
  name,
  label,
  onPress,
  active,
  style,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        s.iconButton,
        active && { borderColor: C.green },
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      <Icon name={name} color={active ? C.green : C.mint} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  secondary,
  disabled,
  icon,
  style,
}: {
  children: ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityLabel={typeof children === "string" ? children : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.7, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      {icon && (
        <Icon name={icon} size={16} color={secondary ? C.mint : C.black} />
      )}
      <Txt
        display
        style={{
          fontSize: 16,
          letterSpacing: 0.6,
          color: secondary ? C.mint : C.black,
        }}
      >
        {children}
      </Txt>
    </Pressable>
  );
}
export function Avatar({
  creator,
  size = 42,
  me,
  uri,
}: {
  creator?: Creator;
  size?: number;
  me?: boolean;
  uri?: string;
}) {
  const { profile } = useSocial();
  const photo = useMedia(uri ?? (me ? profile.avatarUri : creator?.avatarUri));
  return (
    <View
      style={[
        s.avatar,
        {
          width: size,
          height: size,
          backgroundColor: creator?.color ?? C.green,
        },
      ]}
    >
      {photo || creator?.avatar ? (
        <Image
          source={photo ? { uri: photo } : creator?.avatar}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      ) : (
        <Icon
          name={me ? "scissors" : (creator?.icon ?? "user")}
          size={size * 0.45}
          color={C.black}
        />
      )}
    </View>
  );
}
export function Header() {
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  return (
    <View style={s.header}>
      <Pressable
        accessibilityLabel="Ir a Inicio"
        onPress={() => router.navigate("/")}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={s.logo}>
            <Txt
              display
              style={{ fontSize: 31, color: C.black, lineHeight: 38 }}
            >
              CUT
            </Txt>
            <Icon name="scissors" size={18} color={C.black} />
          </View>
          {width >= 410 && (
            <View>
              <Txt style={{ fontSize: 12, letterSpacing: 1.4, color: C.muted }}>
                CULTURA SIN FILTRO.
              </Txt>
              <Txt style={{ fontSize: 12, letterSpacing: 1.4, color: C.muted }}>
                HECHO POR TI.
              </Txt>
            </View>
          )}
        </View>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View>
          <IconButton
            name="bell"
            label="Notificaciones"
            onPress={() => router.push("/notifications")}
          />
          {unreadCount > 0 && (
            <View
              accessible
              accessibilityLabel="Hay notificaciones sin leer"
              style={s.dot}
            />
          )}
        </View>
        <Pressable
          accessibilityLabel="Mi perfil"
          onPress={() => router.navigate("/profile")}
        >
          <Avatar me size={38} />
        </Pressable>
      </View>
    </View>
  );
}
export function Page({
  children,
  header = true,
  style,
}: ViewProps & { header?: boolean }) {
  const { ready, syncError, retry } = useSocial();
  return (
    <SafeAreaView
      edges={
        header ? ["top", "left", "right"] : ["top", "left", "right", "bottom"]
      }
      style={[s.page, style]}
    >
      {header && <Header />}
      {!!syncError && (
        <View style={{ padding: 14, gap: 10, backgroundColor: C.panel }}>
          <Txt
            accessibilityRole="alert"
            style={{ color: "#ffbd9d", fontSize: 14 }}
          >
            {syncError}
          </Txt>
          <Button secondary onPress={retry}>
            REINTENTAR CONEXIÓN
          </Button>
        </View>
      )}
      {ready ? (
        children
      ) : (
        <ActivityIndicator style={{ flex: 1 }} color={C.green} />
      )}
    </SafeAreaView>
  );
}
export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.heading}>
      <View>
        <Txt display style={{ fontSize: 30, letterSpacing: 0.3 }}>
          {title}
        </Txt>
        {subtitle && (
          <Txt style={{ color: C.muted, fontSize: 15, marginTop: 4 }}>
            {subtitle}
          </Txt>
        )}
      </View>
      {action}
    </View>
  );
}
export function BackHeader({ title }: { title: string }) {
  return (
    <View style={s.back}>
      <IconButton
        name="arrow-left"
        label="Volver"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      <Txt display style={{ fontSize: 23, letterSpacing: 0.5 }}>
        {title}
      </Txt>
      <Icon name="scissors" size={19} color={C.green} />
    </View>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={s.empty}>
      <Icon name="scissors" size={32} color={C.green} />
      <Txt display style={{ fontSize: 23, marginTop: 14 }}>
        {title}
      </Txt>
      <Txt
        style={{
          color: C.muted,
          textAlign: "center",
          lineHeight: 26,
          marginTop: 8,
        }}
      >
        {text}
      </Txt>
    </View>
  );
}
export const s = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: C.bg,
  },
  header: {
    height: 78,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    backgroundColor: C.green,
    borderColor: C.text,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    transform: [{ rotate: "-3deg" }],
    boxShadow: "3px 3px 0 #070908",
  },
  iconButton: {
    width: 42,
    height: 42,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    top: -2,
    right: -2,
    borderWidth: 1,
    borderColor: C.bg,
    backgroundColor: C.green,
  },
  avatar: {
    borderWidth: 2,
    borderColor: C.black,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 12,
    backgroundColor: C.green,
    borderWidth: 1,
    borderColor: C.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "3px 3px 0 #070908",
  },
  secondary: { backgroundColor: C.panel, borderColor: C.line },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  input: {
    color: C.text,
    fontFamily: "Space",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.panel,
    padding: 14,
    fontSize: 17,
    minWidth: 0,
    minHeight: 48,
    outlineWidth: 0,
  },
  empty: { padding: 36, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
});
