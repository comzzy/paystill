import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Paystill", description: "Check a SaaS subscription before it renews." };

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="testnet">Sepolia testnet. Payments use test USDC with no real value.</div>
        <header className="top">
          <Link href="/" className="brand">Paystill</Link>
          <nav>
            <Link href="/">Renewals</Link>
            <Link href="/add">Add</Link>
            <Link href="/evidence">Receipts</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
