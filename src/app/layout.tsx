import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Requiroom",
  description: "In-browser desktop with proxy browser, shell, files, and AI assistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-look="3d"
      data-style="modern"
      data-icons="outline"
      data-wallpaper="aurora"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrains.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="h-full w-full overflow-hidden m-0 p-0">{children}</body>
    </html>
  );
}
