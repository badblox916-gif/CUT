import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, C, Icon, IconButton, Txt, s } from "@/components/cut/ui";
import { useAuth } from "@/context/auth";

export default function SignInScreen() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const registering = mode === "sign-up";

  const changeMode = (next: typeof mode) => {
    if (submitting.current || next === mode) return;
    setMode(next);
    setError("");
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
  };

  const submit = async () => {
    if (submitting.current || !isConfigured) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }
    if (registering && password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (registering && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      if (registering) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.brand}>
            <Txt display style={styles.logo}>
              CUT
            </Txt>
            <Icon name="scissors" size={27} color={C.black} />
          </View>
          <View style={styles.heading}>
            <Txt style={styles.eyebrow}>CULTURA SIN FILTRO.</Txt>
            <Txt display style={styles.title}>
              TU CULTURA.{"\n"}TU ESPACIO.
            </Txt>
            <Txt style={styles.subtitle}>
              {registering
                ? "Primero tu cuenta. Después, tu perfil."
                : "Inicia sesión para entrar a CUT."}
            </Txt>
          </View>

          <View style={styles.form}>
            <View style={styles.modes}>
              {(
                [
                  { value: "sign-in", label: "Iniciar sesión" },
                  { value: "sign-up", label: "Registrarme" },
                ] as const
              ).map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="tab"
                  accessibilityLabel={item.label}
                  accessibilityState={{
                    selected: mode === item.value,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => changeMode(item.value)}
                  style={[
                    styles.mode,
                    mode === item.value && styles.modeSelected,
                  ]}
                >
                  <Txt
                    display
                    style={{
                      fontSize: 15,
                      letterSpacing: 0.4,
                      color: mode === item.value ? C.black : C.mint,
                    }}
                  >
                    {item.label.toUpperCase()}
                  </Txt>
                </Pressable>
              ))}
            </View>
            <Txt display style={styles.formTitle}>
              {registering ? "CREA TU CUENTA" : "BIENVENIDO DE NUEVO"}
            </Txt>
            {registering && (
              <Txt style={styles.passwordHelp}>PASO 1 DE 2 · TU CUENTA</Txt>
            )}
            <View style={styles.field}>
              <Txt display style={styles.label}>
                CORREO ELECTRÓNICO
              </Txt>
              <TextInput
                accessibilityLabel="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={C.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                editable={!busy}
                maxLength={254}
                style={s.input}
              />
            </View>
            <View style={styles.field}>
              <Txt display style={styles.label}>
                CONTRASEÑA
              </Txt>
              <View style={styles.password}>
                <TextInput
                  accessibilityLabel="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Tu contraseña"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={
                    registering ? "new-password" : "current-password"
                  }
                  textContentType={registering ? "newPassword" : "password"}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  editable={!busy}
                  style={[s.input, { flex: 1, borderWidth: 0, minWidth: 0 }]}
                />
                <IconButton
                  name={showPassword ? "eye-off" : "eye"}
                  label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ borderWidth: 0, marginRight: 3 }}
                />
              </View>
            </View>
            {registering && (
              <View style={styles.field}>
                <Txt style={styles.passwordHelp}>
                  Usa al menos 6 caracteres.
                </Txt>
                <Txt display style={styles.label}>
                  CONFIRMAR CONTRASEÑA
                </Txt>
                <TextInput
                  accessibilityLabel="Confirmar contraseña"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={C.muted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!busy}
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  style={s.input}
                />
              </View>
            )}
            {error ? (
              <Txt
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={styles.error}
              >
                {error}
              </Txt>
            ) : null}
            {!isConfigured && (
              <View style={styles.notice}>
                <Icon name="lock" size={17} color={C.green} />
                <Txt
                  style={{
                    flex: 1,
                    color: C.muted,
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  El acceso a CUT estará disponible pronto.
                </Txt>
              </View>
            )}
            <Button
              icon={registering ? "user-plus" : "log-in"}
              disabled={busy || !isConfigured}
              onPress={() => void submit()}
              style={styles.submit}
            >
              {busy
                ? registering
                  ? "CREANDO CUENTA…"
                  : "ENTRANDO…"
                : registering
                  ? "CREAR CUENTA"
                  : "INICIAR SESIÓN"}
            </Button>
          </View>
          <View style={styles.footer}>
            <Icon name="scissors" size={15} color={C.muted} />
            <Txt style={styles.footerText}>HECHO POR TI.</Txt>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 26,
  },
  brand: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.green,
    borderWidth: 1,
    borderColor: C.text,
    paddingHorizontal: 13,
    paddingVertical: 2,
    transform: [{ rotate: "-3deg" }],
    boxShadow: "4px 4px 0 #070908",
  },
  logo: { color: C.black, fontSize: 45, lineHeight: 57 },
  heading: { marginTop: 34, marginBottom: 30, gap: 12 },
  eyebrow: { fontSize: 12, color: C.muted, letterSpacing: 2 },
  title: { fontSize: 43, lineHeight: 52, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, lineHeight: 25, color: C.muted },
  form: { gap: 21, borderTopWidth: 1, borderColor: C.line, paddingTop: 24 },
  modes: { flexDirection: "row", gap: 8 },
  mode: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.panel,
    paddingHorizontal: 8,
  },
  modeSelected: { backgroundColor: C.green, borderColor: C.green },
  passwordHelp: { color: C.muted, fontSize: 13, lineHeight: 20 },
  formTitle: { fontSize: 22, letterSpacing: 0.8 },
  field: { gap: 9 },
  label: { fontSize: 13, letterSpacing: 1, color: C.mint },
  password: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
  },
  error: { fontSize: 14, lineHeight: 23, color: "#ffbd9d" },
  notice: { flexDirection: "row", alignItems: "center", gap: 10 },
  submit: { minHeight: 54 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingTop: 28,
    marginTop: "auto",
  },
  footerText: { fontSize: 11, letterSpacing: 2, color: C.muted },
});
