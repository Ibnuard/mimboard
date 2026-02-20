import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PapanMeme",
  description: "Upload your meme to the board!",
  icons: {
    icon: `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>😊</text></svg>`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script id="anti-devtools" strategy="afterInteractive">{`
          // Block right-click
          document.addEventListener('contextmenu', function(e) { e.preventDefault(); });

          // Block DevTools shortcuts
          document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12') { e.preventDefault(); return false; }
            // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
            if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return false; }
            // Ctrl+U (View Source)
            if (e.ctrlKey && e.key.toUpperCase() === 'U') { e.preventDefault(); return false; }
          });

          // DevTools detection via debugger timing
          (function detect() {
            const t = performance.now();
            debugger;
            if (performance.now() - t > 100) {
              document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#ff4444;font-family:monospace;font-size:24px;text-align:center;padding:20px;">⛔ DevTools terdeteksi. Halaman dinonaktifkan.</div>';
            }
            setTimeout(detect, 3000);
          })();
        `}</Script>
      </body>
    </html>
  );
}
