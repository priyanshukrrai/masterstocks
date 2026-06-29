import "./globals.css";
import { Space_Grotesk } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata = {
  title: "MasterStocks — Stock & Crypto Tracker",
  description:
    "Premium real-time stock, crypto and Indian market tracker. Developed by Priyanshu Kumar Rai.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
