import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".tmp/**", "packages/mcp/dist/**"],
  },
];

export default eslintConfig;
