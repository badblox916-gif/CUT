import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
  Empty,
  Page,
  Txt,
  s,
} from "@/components/cut/ui";
import { PostCard } from "@/components/cut/post-card";
import { useSocial } from "@/context/social";
export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const social = useSocial();
  const post = social.posts.find((post) => post.id === id);
  const [text, setText] = useState("");
  if (!post)
    return (
      <Page header={false}>
        <BackHeader title="CORTE" />
        <Empty
          title="CORTE NO ENCONTRADO"
          text="Esta publicación ya no está disponible."
        />
      </Page>
    );
  return (
    <Page header={false}>
      <BackHeader title="LA CONVERSACIÓN" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 20, paddingBottom: 30 }}
        >
          <PostCard post={post} />
          <View style={{ paddingHorizontal: 20 }}>
            <Txt display style={{ fontSize: 22, marginVertical: 12 }}>
              COMENTARIOS{" "}
              <Txt style={{ color: C.green }}>({post.comments.length})</Txt>
            </Txt>
            {post.comments.length === 0 && (
              <Empty
                title="ROMPE EL HIELO"
                text="Sé la primera persona en responder a este corte."
              />
            )}
            {post.comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.initial}>
                  <Txt display style={{ color: C.black }}>
                    {comment.author.slice(0, 2).toUpperCase()}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ color: C.green, fontSize: 14 }}>
                    @{comment.author}
                  </Txt>
                  <Txt style={{ lineHeight: 25, fontSize: 16, marginTop: 7 }}>
                    {comment.text}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.reply}>
          <Avatar me size={34} />
          <TextInput
            accessibilityLabel="Escribir comentario"
            maxLength={500}
            value={text}
            onChangeText={setText}
            placeholder="Suma tu voz…"
            placeholderTextColor={C.muted}
            style={[s.input, { flex: 1, minHeight: 48 }]}
            onSubmitEditing={() => {
              if (text.trim()) {
                social.addComment(post.id, text);
                setText("");
              }
            }}
          />
          <Button
            icon="send"
            disabled={!text.trim()}
            onPress={() => {
              social.addComment(post.id, text);
              setText("");
            }}
            style={{ paddingHorizontal: 10 }}
          >
            ENVIAR
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Page>
  );
}
const styles = StyleSheet.create({
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  initial: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.mint,
  },
  reply: {
    padding: 15,
    paddingBottom: 25,
    backgroundColor: C.panel,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderColor: C.line,
  },
});
