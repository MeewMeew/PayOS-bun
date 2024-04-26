export const objectToQueryString = (object: Record<string, any>): string => {
  return Object.keys(object).map((key) => `${key}=${object[key]}`).join('&');
}