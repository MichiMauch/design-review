import './globals.css';

export const metadata = {
  title: 'Website Review Tool',
  description: 'Ein einbindbares JavaScript-Widget für Website-Feedback mit Screenshots',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}