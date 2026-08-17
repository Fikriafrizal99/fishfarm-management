import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FishFarm Management",
    short_name: "FishFarm",
    description: "Aplikasi manajemen budidaya ikan",
    start_url: "/",
    display: "standalone",
    background_color: "#f4fbfb",
    theme_color: "#078c91",
    lang: "id",
  };
}
