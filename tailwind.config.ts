/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#EEF2FF", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA" },
        accent: { 500: "#10B981", 600: "#059669" },
        info: { 500: "#0EA5E9" },
        warning: { 500: "#F59E0B" },
        danger: { 500: "#F43F5E" },
        neutral: {
          50: "#F8FAFC", 100:"#F1F5F9", 200:"#E2E8F0", 300:"#CBD5E1",
          600:"#475569", 700:"#334155", 800:"#1F2937", 900:"#0F172A"
        }
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
      },
      borderRadius: { xl: "14px", "2xl": "20px" }
    }
  },
  plugins: []
}