export const getDeviceId = () => {
  const key = "monthlane-device-id";
  const current = localStorage.getItem(key);
  if (current) return current;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
};
