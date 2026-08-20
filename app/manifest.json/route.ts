const manifest = {
  $schema: "https://json.schemastore.org/web-manifest-combined.json",
  id: "/?source=pwa",
  name: "BarDoctor — управление заведением",
  short_name: "BarDoctor",
  description: "Операционный контроль бара или ресторана: смены, финансы, команда, оборудование и AI-рекомендации.",
  lang: "ru",
  dir: "ltr",
  start_url: "/home?source=pwa",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#070b24",
  theme_color: "#070b24",
  categories: ["business", "finance", "productivity"],
  icons: [
    { src: "/icons/bardoctor-v159-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/bardoctor-v159-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/bardoctor-v159-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/bardoctor-v159-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

export function GET(): Response {
  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, max-age=0, must-revalidate",
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
