import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://arkatriymfalnaya.github.io/",
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: "nord",
    },
    remarkPlugins: ["remark-gfm", "remark-smartypants"],
    rehypePlugins: [
      [
        "rehype-external-links",
        {
          target: "_blank",
        },
      ],
    ],
  },
});
