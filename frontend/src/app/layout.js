import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers"; 

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
});

export const metadata = {
  title: "TimberCraft | Premium Woodwork",
  description: "Handcrafted timber for the modern home.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-500`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}