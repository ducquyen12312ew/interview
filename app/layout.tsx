import "../styles/globals.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "アイウ - Luyện Phỏng Vấn AI",
  description:
    "Nền tảng luyện phỏng vấn kỹ thuật bằng AI giúp bạn tự tin hơn trong mỗi cuộc phỏng vấn.",
  openGraph: {
    title: "アイウ - Luyện Phỏng Vấn AI",
    description:
      "Nền tảng luyện phỏng vấn kỹ thuật bằng AI giúp bạn tự tin hơn trong mỗi cuộc phỏng vấn.",
    images: [
      {
        url: "/opengraph-image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "アイウ - Luyện Phỏng Vấn AI",
    description:
      "Nền tảng luyện phỏng vấn kỹ thuật bằng AI giúp bạn tự tin hơn trong mỗi cuộc phỏng vấn.",
    images: ["/opengraph-image"],
  },
  metadataBase: new URL("https://aiu-interview.vercel.app"),
  themeColor: "#FFF",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="scroll-smooth antialiased [font-feature-settings:'ss01']">
        {children}
      </body>
    </html>
  );
}
