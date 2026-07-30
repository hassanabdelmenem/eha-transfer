export async function fetchData<T>(value: T): Promise<{ data: T }> {
  // simulate async work
  return new Promise((resolve) => setTimeout(() => resolve({ data: value }), 5));
}
