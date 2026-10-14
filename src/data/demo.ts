export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar?: number;
  icon: "user" | "edit-3" | "music" | "zap";
  color: string;
  bio: string;
};
export type Comment = { id: string; text: string; author: string };
export type Post = {
  id: string;
  creatorId: string;
  text: string;
  tag: string;
  time: string;
  image?: number;
  imageUri?: string;
  videoUri?: string;
  reel?: boolean;
  likes: number;
  reposts: number;
  comments: Comment[];
  poll?: { options: string[]; votes: number[] };
};
export const creators: Creator[] = [
  {
    id: "vale",
    name: "Valeria Ríos",
    handle: "vale.studio",
    avatar: require("@/assets/media/creator.jpg"),
    icon: "user",
    color: "#c5ddc8",
    bio: "Diseño, calle y un poco de caos. Creando desde CDMX.",
  },
  {
    id: "nico",
    name: "Nico Torres",
    handle: "nico.onboard",
    avatar: require("@/assets/media/skater.jpg"),
    icon: "zap",
    color: "#b9bcd4",
    bio: "Siempre en movimiento. Skate & cultura urbana.",
  },
  {
    id: "casa",
    name: "Casa Collage",
    handle: "casa.collage",
    icon: "edit-3",
    color: "#e5cf9c",
    bio: "Recortamos lo cotidiano. Arte independiente y fanzines.",
  },
  {
    id: "sound",
    name: "Sonido Local",
    handle: "sonido.local",
    icon: "music",
    color: "#aad3bb",
    bio: "El sonido de la ciudad. Sesiones y descubrimientos.",
  },
];
export const initialPosts: Post[] = [
  {
    id: "street",
    creatorId: "vale",
    text: "La calle es el mejor moodboard. Un look, mil formas de contar quién eres. ✂️",
    tag: "#StreetStyle",
    time: "Hace 24 min",
    image: require("@/assets/media/street.jpg"),
    likes: 248,
    reposts: 18,
    comments: [
      { id: "c1", author: "nico.onboard", text: "Esa energía es todo 🔥" },
      {
        id: "c2",
        author: "casa.collage",
        text: "El próximo fanzine necesita este look.",
      },
    ],
  },
  {
    id: "poll",
    creatorId: "casa",
    text: "El próximo drop lo decides tú. ¿Qué portada se queda en nuestro nuevo fanzine?",
    tag: "#CollageArt",
    time: "Hace 1 h",
    likes: 86,
    reposts: 9,
    comments: [],
    poll: {
      options: ["COLLAGE ANALÓGICO", "TIPOGRAFÍA EXPERIMENTAL"],
      votes: [65, 35],
    },
  },
  {
    id: "kicks",
    creatorId: "nico",
    text: "Un clásico que nunca se queda quieto. Hoy salimos a gastar suela.",
    tag: "#SneakerCulture",
    time: "Hace 2 h",
    image: require("@/assets/media/sneakers.jpg"),
    likes: 192,
    reposts: 12,
    comments: [{ id: "c3", author: "vale.studio", text: "El color perfecto." }],
  },
  {
    id: "night",
    creatorId: "sound",
    text: "Cuando la ciudad baja el ritmo, subimos el volumen. Nos vemos del otro lado.",
    tag: "#SonidoLocal",
    time: "Hace 3 h",
    image: require("@/assets/media/city.jpg"),
    likes: 324,
    reposts: 28,
    comments: [],
  },
  {
    id: "rain",
    creatorId: "sound",
    text: "La ciudad también tiene su propio beat. Escucha la lluvia, encuentra tu ritmo.",
    tag: "#CitySessions",
    time: "Hoy",
    image: require("@/assets/media/city.jpg"),
    reel: true,
    likes: 1240,
    reposts: 42,
    comments: [{ id: "r1", author: "vale.studio", text: "Mi mood de hoy. 🌧️" }],
  },
];
export const trends = [
  { category: "MODA & CULTURA", tag: "#StreetStyle", count: "34.2k cortes" },
  { category: "ARTE INDEPENDIENTE", tag: "#CollageArt", count: "18.9k cortes" },
  {
    category: "SONIDO DE LA CIUDAD",
    tag: "#SonidoLocal",
    count: "52.1k cortes",
  },
];
