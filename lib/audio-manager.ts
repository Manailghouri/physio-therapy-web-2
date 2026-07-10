export const audioFiles = {
  en: {
    up: "/audio/en/en-up.mp3",
    down: "/audio/en/en-down.mp3",
    perfect: "/audio/en/en-perfect.mp3",
  },

  ur: {
    up: "/audio/ur/ur-up.mp3",
    down: "/audio/ur/ur-down.mp3",
    perfect: "/audio/ur/ur-perfect.mp3",
  },
};

export function playAudio(path: string) {
  const audio = new Audio(path);
  audio.play();
}