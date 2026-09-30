const nextConfig = {
  // Les tests e2e utilisent un dossier de build dédié pour ne pas écraser celui du serveur de dev.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
