import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CitiusTech Perform+",
  description: "Connected risk adjustment workspace.",
  icons: {
    icon: [
      {
        url: "/brand/citiustech-mark.jpeg",
        type: "image/jpeg",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
