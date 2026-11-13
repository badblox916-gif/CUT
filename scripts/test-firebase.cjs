const { readFileSync } = require("node:fs");
const ts = require("typescript");
// Run the exact TypeScript service used by the app without adding a test runtime.
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { initializeApp, deleteApp } = require("firebase/app");
const {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} = require("firebase/auth");
const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  collection,
  collectionGroup,
  query,
  where,
  getDoc,
  getDocs,
  deleteDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  terminate,
} = require("firebase/firestore");
const {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  deleteObject,
} = require("firebase/storage");
const {
  saveCloudProfile,
  createCloudPost,
  changeReaction,
  toggleCloudItem,
  createCloudComment,
  ensureCloudRepost,
  repostId,
} = require("../src/lib/social-store.ts");
const {
  activeStoryGroups,
  createCloudStory,
  STORY_LIFETIME,
} = require("../src/lib/stories.ts");
const { markNotificationsRead } = require("../src/lib/notifications.ts");
const { searchProfilesPage } = require("../src/lib/search-profiles.ts");
const { deleteCloudContent } = require("../src/lib/delete-content.ts");
const { connectionIds } = require("../src/lib/connections.ts");
const { sendUpload } = require("../src/lib/upload-request.ts");
const {
  captureMedia,
  checkedMedia,
  CameraPermissionError,
} = require("../src/lib/capture-media.ts");

test("upload transport reports measured progress, processing and cancellation", async () => {
  const previous = global.XMLHttpRequest;
  let request;
  global.XMLHttpRequest = class {
    upload = {};
    status = 200;
    responseText = '{"secure_url":"https://example.test/photo.jpg"}';
    constructor() {
      request = this;
    }
    open() {}
    send() {}
    abort() {
      this.onabort();
    }
  };
  try {
    const progress = [];
    const result = sendUpload("https://example.test", new FormData(), {
      onProgress: (value) => progress.push(value),
    });
    request.upload.onprogress({
      loaded: 500,
      total: 1000,
      lengthComputable: true,
    });
    request.upload.onload();
    request.onload();
    assert.equal(
      (await result).data.secure_url,
      "https://example.test/photo.jpg",
    );
    assert.deepEqual(progress, [
      { phase: "sending", sent: 0 },
      { phase: "sending", sent: 500, total: 1000 },
      { phase: "processing" },
    ]);
    const controller = new AbortController();
    const canceled = sendUpload("https://example.test", new FormData(), {
      signal: controller.signal,
    });
    controller.abort();
    await assert.rejects(canceled, /canceló/);
    const timeout = sendUpload("https://example.test", new FormData());
    request.ontimeout();
    await assert.rejects(timeout, /tardó demasiado/);
    const invalidResponse = sendUpload("https://example.test", new FormData());
    request.responseText = "null";
    request.onload();
    assert.deepEqual((await invalidResponse).data, {});
  } finally {
    global.XMLHttpRequest = previous;
  }
});

test("native camera requests permission before opening and reports blocked versus retryable access", async () => {
  let granted = false;
  let canAskAgain = false;
  const calls = [];
  const api = {
    CameraType: { back: "back" },
    UIImagePickerControllerQualityType: { Medium: 1 },
    requestCameraPermissionsAsync: async () => {
      calls.push("permission");
      return { granted, canAskAgain };
    },
    launchCameraAsync: async (options) => {
      calls.push(options);
      return { canceled: true, assets: null };
    },
  };
  await assert.rejects(
    captureMedia(api, "photo", false),
    (cause) => cause instanceof CameraPermissionError && cause.canOpenSettings,
  );
  assert.deepEqual(calls, ["permission"]);
  canAskAgain = true;
  await assert.rejects(
    captureMedia(api, "video", false),
    (cause) => cause instanceof CameraPermissionError && !cause.canOpenSettings,
  );
  granted = true;
  const result = await captureMedia(api, "video", false);
  assert.equal(result.canceled, true);
  assert.equal(calls.at(-2), "permission");
  assert.deepEqual(calls.at(-1).mediaTypes, ["videos"]);
  assert.equal(calls.at(-1).videoMaxDuration, 60);
});

test("web capture opens synchronously in the click gesture and captured assets enforce type, size and recording limits", async () => {
  let opened = false;
  const api = {
    CameraType: { back: "back" },
    UIImagePickerControllerQualityType: { Medium: 1 },
    requestCameraPermissionsAsync: async () => {
      throw new Error("Web must not await permissions");
    },
    launchCameraAsync: async (options) => {
      opened = true;
      assert.deepEqual(options.mediaTypes, ["images"]);
      return { canceled: true, assets: null };
    },
  };
  const pending = captureMedia(api, "photo", true);
  assert.equal(opened, true);
  await pending;
  const photo = { uri: "file:///photo.jpg", type: "image", fileSize: 1024 };
  assert.throws(() => checkedMedia(photo, true), /reel/);
  assert.throws(
    () => checkedMedia({ ...photo, fileSize: 11 * 1024 * 1024 }, false),
    /10 MB/,
  );
  const video = {
    uri: "file:///video.mp4",
    mimeType: "video/mp4",
    duration: 62000,
    fileSize: 1024,
  };
  assert.throws(() => checkedMedia(video, false, "video"), /60 segundos/);
  assert.equal(checkedMedia(video, false).type, "video");
  assert.throws(
    () => checkedMedia({ ...video, fileSize: 51 * 1024 * 1024 }, false),
    /50 MB/,
  );
  assert.throws(() => checkedMedia(video, false, "photo"), /foto/);
});

test("story groups include only followed accounts and disappear at the 24-hour boundary", () => {
  const now = Date.now();
  const item = (id, creatorId, age) => ({
    id,
    creatorId,
    text: "",
    imageUri: "https://res.cloudinary.com/demo/image/upload/test.jpg",
    createdAt: now - age,
  });
  const stories = [
    item("own", "a", 500),
    item("followed", "b", STORY_LIFETIME - 1),
    item("expired", "b", STORY_LIFETIME),
    item("stranger", "c", 100),
    item("future", "b", -1000),
  ];
  assert.deepEqual(
    activeStoryGroups(stories, ["b"], "a", now)
      .flatMap((group) => group.stories.map((story) => story.id))
      .sort(),
    ["followed", "own"],
  );
  assert.deepEqual(
    activeStoryGroups(stories, ["b"], "a", now + 1).flatMap((group) =>
      group.stories.map((story) => story.id),
    ),
    ["own"],
  );
  assert.equal(activeStoryGroups(stories, [], "a", now).length, 1);
});

test(
  "shared social content and access rules against local Firebase",
  { timeout: 90000 },
  async (t) => {
    const projectId = "demo-cut";
    for (const url of [
      `http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      `http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,
    ])
      assert.ok((await fetch(url, { method: "DELETE" })).ok);
    const apps = [];
    async function client(name, authenticated = true) {
      const app = initializeApp(
        {
          projectId,
          apiKey: "test-api-key",
          appId: "test-app-id",
          storageBucket: "demo-cut.appspot.com",
        },
        name,
      );
      apps.push(app);
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      const db = getFirestore(app);
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      const storage = getStorage(app);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      const uid = authenticated
        ? (
            await createUserWithEmailAndPassword(
              auth,
              `${name}@example.test`,
              "password-test-123",
            )
          ).user.uid
        : null;
      return { app, db, uid, storage };
    }
    t.after(async () => {
      await Promise.all(
        apps.map(async (app) => {
          await terminate(getFirestore(app));
          await deleteApp(app);
        }),
      );
    });
    const a = await client("account-a");
    const b = await client("account-b");
    const guest = await client("guest", false);
    const profile = (name, handle) => ({ name, handle, bio: "Mi espacio" });
    await saveCloudProfile(a.db, a.uid, {
      ...profile("Ana", "ana.cut"),
      avatarUri:
        "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/avatar.jpg",
    });
    await saveCloudProfile(b.db, b.uid, profile("Bruno", "bruno.cut"));

    await t.test(
      "public profiles synchronize, handles are unique and private fields cannot be injected",
      async () => {
        assert.equal(
          (await getDoc(doc(b.db, "profiles", a.uid))).data().name,
          "Ana",
        );
        await assert.rejects(
          saveCloudProfile(b.db, b.uid, profile("Bruno", "ANA.CUT")),
          /ocupado/,
        );
        await assert.rejects(
          updateDoc(doc(b.db, "profiles", a.uid), { name: "Forged" }),
          { code: "permission-denied" },
        );
        await assert.rejects(
          updateDoc(doc(a.db, "profiles", a.uid), {
            email: "private@example.test",
          }),
          { code: "permission-denied" },
        );
        await assert.rejects(getDoc(doc(guest.db, "profiles", a.uid)), {
          code: "permission-denied",
        });
        await saveCloudProfile(a.db, a.uid, profile("Ana", "ana.nueva"));
        assert.equal(
          (await getDoc(doc(a.db, "handles", "ana.cut"))).exists(),
          false,
        );
        await saveCloudProfile(b.db, b.uid, profile("Bruno", "ana.cut"));
        await saveCloudProfile(b.db, b.uid, profile("Bruno", "bruno.cut"));
      },
    );

    let postId;
    await t.test(
      "a second client receives a publication in real time",
      async () => {
        let stop;
        const received = new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            stop?.();
            reject(new Error("Realtime delivery timed out"));
          }, 10000);
          stop = onSnapshot(
            query(collection(b.db, "posts"), where("creatorId", "==", a.uid)),
            (snapshot) => {
              if (
                snapshot.docs.some(
                  (item) => item.data().text === "Hola comunidad",
                )
              ) {
                clearTimeout(timer);
                stop();
                resolve();
              }
            },
            reject,
          );
        });
        postId = await createCloudPost(a.db, a.uid, {
          text: "Hola comunidad",
          imageUri:
            "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/post.jpg",
          poll: { options: ["Arte", "Música"], votes: [0, 0] },
        });
        await received;
        await assert.rejects(
          updateDoc(doc(b.db, "posts", postId), { text: "Forged" }),
          { code: "permission-denied" },
        );
        await assert.rejects(getDoc(doc(guest.db, "posts", postId)), {
          code: "permission-denied",
        });
      },
    );

    await t.test(
      "likes, reposts, comments and votes belong to authenticated authors",
      async () => {
        await Promise.all([
          changeReaction(a.db, a.uid, postId, "liked"),
          changeReaction(b.db, b.uid, postId, "liked"),
        ]);
        await changeReaction(b.db, b.uid, postId, "reposted");
        await changeReaction(b.db, b.uid, postId, "vote", 1);
        await changeReaction(b.db, b.uid, postId, "vote", 0);
        const reaction = doc(b.db, "reactions", `${postId}_${b.uid}`);
        assert.equal((await getDoc(reaction)).data().vote, 1);
        await assert.rejects(updateDoc(reaction, { vote: 0 }), {
          code: "permission-denied",
        });
        await assert.rejects(
          updateDoc(doc(b.db, "reactions", `${postId}_${a.uid}`), {
            liked: false,
          }),
          { code: "permission-denied" },
        );
        const reactions = await getDocs(
          query(collection(a.db, "reactions"), where("postId", "==", postId)),
        );
        assert.equal(
          reactions.docs.filter((item) => item.data().liked).length,
          2,
        );
        await createCloudComment(
          b.db,
          b.uid,
          postId,
          "bruno.cut",
          "Te veo desde otro teléfono",
        );
        assert.equal(
          (await getDocs(collection(a.db, "posts", postId, "comments"))).size,
          1,
        );
        await assert.rejects(
          createCloudComment(b.db, b.uid, postId, "ana.nueva", "Impersonation"),
          { code: "permission-denied" },
        );
      },
    );

    await t.test(
      "saved items stay private while following relationships are public to authenticated accounts",
      async () => {
        await toggleCloudItem(a.db, a.uid, "saved", postId);
        await toggleCloudItem(b.db, b.uid, "following", a.uid);
        assert.ok(
          (
            await getDoc(doc(a.db, "accounts", a.uid, "saved", postId))
          ).exists(),
        );
        assert.ok(
          (
            await getDoc(doc(a.db, "accounts", b.uid, "following", a.uid))
          ).exists(),
        );
        const graph = await getDocs(collectionGroup(a.db, "following"));
        const paths = graph.docs.map((item) => item.ref.path);
        assert.ok(connectionIds(paths, a.uid).followers.includes(b.uid));
        assert.ok(connectionIds(paths, b.uid).following.includes(a.uid));
        await assert.rejects(getDocs(collectionGroup(guest.db, "following")), {
          code: "permission-denied",
        });
        await assert.rejects(getDocs(collectionGroup(b.db, "saved")), {
          code: "permission-denied",
        });
        await assert.rejects(
          deleteDoc(doc(a.db, "accounts", b.uid, "following", a.uid)),
          { code: "permission-denied" },
        );
        await assert.rejects(
          setDoc(doc(a.db, "accounts", b.uid, "following", "forged"), {
            createdAt: serverTimestamp(),
          }),
          { code: "permission-denied" },
        );
        assert.ok(
          (
            await getDoc(doc(b.db, "accounts", b.uid, "following", a.uid))
          ).exists(),
        );
        await assert.rejects(
          getDoc(doc(b.db, "accounts", a.uid, "saved", postId)),
          { code: "permission-denied" },
        );
        await assert.rejects(
          setDoc(doc(b.db, "accounts", a.uid, "saved", postId), {
            createdAt: serverTimestamp(),
          }),
          { code: "permission-denied" },
        );
        await toggleCloudItem(a.db, a.uid, "saved", postId);
        assert.equal(
          (
            await getDoc(doc(a.db, "accounts", a.uid, "saved", postId))
          ).exists(),
          false,
        );
      },
    );

    await t.test(
      "profile search finds existing names and handles independent of capitalization and accents",
      async () => {
        assert.deepEqual(
          (await searchProfilesPage(a.db, "BRÚNO")).profiles.map(
            (profile) => profile.id,
          ),
          [b.uid],
        );
        assert.deepEqual(
          (await searchProfilesPage(a.db, "@bruno.cut")).profiles.map(
            (profile) => profile.id,
          ),
          [b.uid],
        );
        assert.equal(
          (await searchProfilesPage(a.db, "no-existe-esta-cuenta")).profiles
            .length,
          0,
        );
      },
    );

    await t.test(
      "notifications are private, deduplicated, tied to real events and have persistent read state",
      async () => {
        const inbox = collection(a.db, "accounts", a.uid, "notifications");
        const snapshot = await getDocs(inbox);
        assert.deepEqual(snapshot.docs.map((item) => item.data().type).sort(), [
          "comment",
          "follow",
          "like",
          "repost",
        ]);
        assert.ok(snapshot.docs.every((item) => item.data().actorId === b.uid));
        await assert.rejects(
          getDocs(collection(b.db, "accounts", a.uid, "notifications")),
          { code: "permission-denied" },
        );
        const likeId = `like_${postId}_${b.uid}`;
        const data = {
          actorId: b.uid,
          type: "like",
          postId,
          commentId: "",
          createdAt: serverTimestamp(),
        };
        await assert.rejects(
          setDoc(doc(b.db, "accounts", a.uid, "notifications", likeId), data),
          { code: "permission-denied" },
        );
        await assert.rejects(
          setDoc(
            doc(b.db, "accounts", a.uid, "notifications", "fake-notification"),
            data,
          ),
          { code: "permission-denied" },
        );
        const latest = snapshot.docs
          .map((item) => item.data().createdAt)
          .sort((a, b) => b.toMillis() - a.toMillis())[0];
        await markNotificationsRead(a.db, a.uid, latest);
        const pref = doc(
          a.db,
          "accounts",
          a.uid,
          "preferences",
          "notifications",
        );
        assert.equal(
          (await getDoc(pref)).data().readThrough.toMillis(),
          latest.toMillis(),
        );
        await assert.rejects(
          getDoc(doc(b.db, "accounts", a.uid, "preferences", "notifications")),
          { code: "permission-denied" },
        );
        await createCloudComment(
          a.db,
          a.uid,
          postId,
          "ana.nueva",
          "Comentario propio",
        );
        assert.equal((await getDocs(inbox)).size, 4);
        await changeReaction(b.db, b.uid, postId, "liked");
        await changeReaction(b.db, b.uid, postId, "liked");
        assert.equal((await getDocs(inbox)).size, 4);
        assert.ok(
          (await getDoc(doc(a.db, "accounts", a.uid, "notifications", likeId)))
            .data()
            .createdAt.toMillis() > latest.toMillis(),
        );
      },
    );

    await t.test(
      "stories require a following relationship and cannot forge their author or creation date",
      async () => {
        const follow = doc(b.db, "accounts", b.uid, "following", a.uid);
        if ((await getDoc(follow)).exists())
          await toggleCloudItem(b.db, b.uid, "following", a.uid);
        const id = await createCloudStory(a.db, a.uid, {
          text: "Solo seguidores",
          imageUri:
            "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/story.jpg",
        });
        assert.ok((await getDoc(doc(a.db, "stories", id))).exists());
        await assert.rejects(getDoc(doc(b.db, "stories", id)), {
          code: "permission-denied",
        });
        await toggleCloudItem(b.db, b.uid, "following", a.uid);
        assert.ok((await getDoc(doc(b.db, "stories", id))).exists());
        assert.equal(
          (
            await getDocs(
              query(
                collection(b.db, "stories"),
                where("creatorId", "==", a.uid),
              ),
            )
          ).size,
          1,
        );
        await assert.rejects(
          createCloudStory(b.db, a.uid, {
            text: "Autor falso",
            imageUri:
              "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/story.jpg",
          }),
          { code: "permission-denied" },
        );
        await assert.rejects(
          updateDoc(doc(b.db, "stories", id), { text: "Cambio ajeno" }),
          { code: "permission-denied" },
        );
        await assert.rejects(
          setDoc(doc(a.db, "stories", "forged-date"), {
            creatorId: a.uid,
            text: "",
            imageUri:
              "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/story.jpg",
            videoUri: "",
            createdAt: new Date(Date.now() - STORY_LIFETIME),
          }),
          { code: "permission-denied" },
        );
        await toggleCloudItem(b.db, b.uid, "following", a.uid);
        await assert.rejects(getDoc(doc(b.db, "stories", id)), {
          code: "permission-denied",
        });
      },
    );

    await t.test(
      "only authors can delete posts, reels and stories, and deleted posts reject further interactions",
      async () => {
        for (const reel of [false, true]) {
          const id = await createCloudPost(a.db, a.uid, {
            text: "Para eliminar",
            reel,
            ...(reel
              ? {
                  videoUri:
                    "https://res.cloudinary.com/cut-test-cloud/video/upload/v1/video.mp4",
                }
              : {}),
          });
          await createCloudComment(
            b.db,
            b.uid,
            id,
            "bruno.cut",
            "Un comentario",
          );
          await assert.rejects(
            deleteCloudContent(b.db, b.uid, "posts", id),
            /Solo puedes/,
          );
          await assert.rejects(deleteDoc(doc(b.db, "posts", id)), {
            code: "permission-denied",
          });
          await deleteCloudContent(a.db, a.uid, "posts", id);
          assert.equal((await getDoc(doc(b.db, "posts", id))).exists(), false);
          await assert.rejects(
            getDocs(collection(b.db, "posts", id, "comments")),
            { code: "permission-denied" },
          );
          await assert.rejects(
            createCloudComment(b.db, b.uid, id, "bruno.cut", "Ya no"),
            /disponible/,
          );
          await assert.rejects(
            changeReaction(b.db, b.uid, id, "liked"),
            /disponible/,
          );
          await deleteCloudContent(a.db, a.uid, "posts", id);
        }
        const id = await createCloudStory(a.db, a.uid, {
          text: "Historia para eliminar",
          imageUri:
            "https://res.cloudinary.com/cut-test-cloud/image/upload/v1/story.jpg",
        });
        await assert.rejects(deleteDoc(doc(b.db, "stories", id)), {
          code: "permission-denied",
        });
        await deleteCloudContent(a.db, a.uid, "stories", id);
        assert.equal(
          (
            await getDocs(
              query(
                collection(a.db, "stories"),
                where("creatorId", "==", a.uid),
              ),
            )
          ).docs.some((item) => item.id === id),
          false,
        );
      },
    );

    await t.test(
      "reposts preserve original authorship, upgrade old reactions, reject forged copies and remove atomically",
      async () => {
        const id = await createCloudPost(a.db, a.uid, {
          text: "Autor original",
        });
        const target = doc(b.db, "posts", repostId(id, b.uid));
        const reactionRef = doc(b.db, "reactions", `${id}_${b.uid}`);
        await setDoc(reactionRef, {
          postId: id,
          userId: b.uid,
          liked: false,
          reposted: true,
          vote: -1,
        });
        const forged = {
          creatorId: b.uid,
          originalPostId: id,
          text: "Copia falsa",
          tag: "",
          imageUri: "",
          videoUri: "",
          reel: false,
          poll: null,
          createdAt: serverTimestamp(),
        };
        await assert.rejects(setDoc(target, forged), {
          code: "permission-denied",
        });
        await ensureCloudRepost(b.db, b.uid, id);
        const repost = (await getDoc(target)).data();
        assert.equal(repost.creatorId, b.uid);
        assert.equal(repost.originalPostId, id);
        assert.equal(repost.text, "");
        assert.ok(repost.createdAt.toMillis() > 0);
        await ensureCloudRepost(b.db, b.uid, id);
        assert.ok(
          (await getDoc(target)).data().createdAt.isEqual(repost.createdAt),
        );
        await assert.rejects(deleteDoc(doc(a.db, "posts", target.id)), {
          code: "permission-denied",
        });
        await assert.rejects(updateDoc(target, { originalPostId: "otro" }), {
          code: "permission-denied",
        });
        await changeReaction(a.db, a.uid, target.id, "reposted");
        assert.equal(
          (await getDoc(doc(a.db, "posts", repostId(id, a.uid)))).data()
            .originalPostId,
          id,
        );
        await deleteCloudContent(b.db, b.uid, "posts", target.id);
        assert.equal((await getDoc(target)).exists(), false);
        assert.equal((await getDoc(reactionRef)).data().reposted, false);
        assert.ok((await getDoc(doc(a.db, "posts", id))).exists());
        await changeReaction(b.db, b.uid, id, "reposted");
        assert.ok((await getDoc(target)).exists());
        await changeReaction(b.db, b.uid, id, "reposted");
        assert.equal((await getDoc(target)).exists(), false);
        await changeReaction(b.db, b.uid, id, "reposted");
        await deleteCloudContent(a.db, a.uid, "posts", id);
        assert.ok((await getDoc(target)).exists());
        await deleteCloudContent(b.db, b.uid, "posts", target.id);
        assert.equal((await getDoc(target)).exists(), false);
      },
    );

    await t.test(
      "feed video posts are valid while reels still require a video and media types cannot be mixed",
      async () => {
        const id = await createCloudPost(a.db, a.uid, {
          text: "Video del inicio",
          videoUri:
            "https://res.cloudinary.com/cut-test-cloud/video/upload/recorded.mp4",
          reel: false,
        });
        const saved = (await getDoc(doc(b.db, "posts", id))).data();
        assert.equal(saved.reel, false);
        assert.equal(saved.imageUri, "");
        assert.ok(saved.videoUri.endsWith("recorded.mp4"));
        await assert.rejects(
          createCloudPost(a.db, a.uid, { text: "Sin video", reel: true }),
          /video/,
        );
        await assert.rejects(
          createCloudPost(a.db, a.uid, {
            text: "Ambos",
            imageUri:
              "https://res.cloudinary.com/cut-test-cloud/image/upload/photo.jpg",
            videoUri:
              "https://res.cloudinary.com/cut-test-cloud/video/upload/recorded.mp4",
            reel: false,
          }),
          { code: "permission-denied" },
        );
      },
    );

    await t.test(
      "concurrent handle claims have exactly one winner",
      async () => {
        const result = await Promise.allSettled([
          saveCloudProfile(a.db, a.uid, profile("Ana", "nombre.unico")),
          saveCloudProfile(b.db, b.uid, profile("Bruno", "nombre.unico")),
        ]);
        assert.equal(
          result.filter((item) => item.status === "fulfilled").length,
          1,
        );
        assert.equal(
          result.filter((item) => item.status === "rejected").length,
          1,
        );
      },
    );

    await t.test(
      "Storage accepts images and videos only under their owner's path",
      async () => {
        const image = ref(a.storage, `users/${a.uid}/test-image`);
        await uploadBytes(image, readFileSync("tests/fixtures/photo.jpg"), {
          contentType: "image/jpeg",
        });
        await uploadBytes(
          ref(b.storage, `users/${b.uid}/test-video`),
          readFileSync("tests/fixtures/video.mp4"),
          { contentType: "video/mp4" },
        );
        await assert.rejects(
          uploadBytes(
            ref(b.storage, `users/${a.uid}/forged`),
            new Uint8Array([1]),
            { contentType: "image/jpeg" },
          ),
          { code: "storage/unauthorized" },
        );
        await assert.rejects(
          uploadBytes(
            ref(a.storage, `users/${a.uid}/script`),
            new Uint8Array([1]),
            { contentType: "text/html" },
          ),
          { code: "storage/unauthorized" },
        );
        await assert.rejects(deleteObject(ref(b.storage, image.fullPath)), {
          code: "storage/unauthorized",
        });
        await deleteObject(image);
      },
    );
  },
);
