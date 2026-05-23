import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts}",
    "./lib/**/*.{js,ts}",
    "./src/**/*.{js,ts}",
  ],
  theme: { extend: {} },
  plugins: [],
}

export default config
