import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPRITEFORGE STUDIO API",
  description: "Backend de licenciamento do SPRITEFORGE STUDIO"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
