type ShopWithRoute = {
  _id: string;
  sequence?: number;
  routeId?: { _id?: string };
};

const getSequence = (shop: ShopWithRoute): number => {
  const sequence = Number(shop.sequence);
  return Number.isFinite(sequence) && sequence >= 0 ? sequence : 0;
};

export const sortShopsByRouteSequence = <T extends ShopWithRoute>(shops: T[]): T[] =>
  [...shops].sort((left, right) => getSequence(left) - getSequence(right));

export const sortShopsWithinRoutes = <T extends ShopWithRoute>(shops: T[]): T[] => {
  const groups = new Map<string, T[]>();
  shops.forEach((shop) => {
    const routeId = shop.routeId?._id || "";
    const group = groups.get(routeId) || [];
    group.push(shop);
    groups.set(routeId, group);
  });
  groups.forEach((group) => group.sort((left, right) => getSequence(left) - getSequence(right)));

  const indexes = new Map<string, number>();
  return shops.map((shop) => {
    const routeId = shop.routeId?._id || "";
    const index = indexes.get(routeId) || 0;
    indexes.set(routeId, index + 1);
    return groups.get(routeId)![index];
  });
};
