export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://checkin-api.vlocityarena.com";

export const getApiUrl = (path: string) => {
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const cleanBase = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  let finalPath = cleanPath;
  if (finalPath.startsWith("/api/")) finalPath = finalPath.slice(4);
  return `${cleanBase}${finalPath}`;
};
