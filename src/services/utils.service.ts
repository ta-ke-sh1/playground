export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const SHUFFLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export const shuffleText = (target: string, iteration: number) => {
  return target
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (index < iteration / 3) {
        return target[index];
      }
      return SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)];
    })
    .join("");
};
