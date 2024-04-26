export const sortObjectByKey = (object: Record<string, any>): any => {
  return Object.keys(object)
    .sort()
    .reduce((acc: Record<string, any>, key) => {
      acc[key] = object[key];
      return acc;
    }, {});
};