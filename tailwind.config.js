/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: "#12372A",
        leaf: "#2D6A4F",
        mint: "#B7E4C7",
        cream: "#F7F8F2",
        earth: "#B08968"
      },
      boxShadow: {
        soft: "0 10px 35px rgba(18, 55, 42, 0.08)"
      }
    }
  },
  plugins: []
};
