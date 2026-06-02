import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: ["public/scene-assets/**", "public/supersplat-viewer/**"],
  },
  ...nextVitals,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 450,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
];

export default eslintConfig;
