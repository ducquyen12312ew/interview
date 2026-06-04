import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aiu-interview.vercel.app",
      lastModified: new Date(),
    },
    {
      url: "https://aiu-interview.vercel.app/demo",
      lastModified: new Date(),
    },
  ];
}
